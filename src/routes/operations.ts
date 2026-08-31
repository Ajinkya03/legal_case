import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { Hearing } from '../modules/hearings/hearing.model';
import { DocumentModel } from '../modules/documents/document.model';
import { Notification } from '../modules/notifications/notification.model';
import { CalendarEvent } from '../modules/calendar/calendarEvent.model';
import { Settings } from '../modules/settings/settings.model';
import { Case } from '../modules/cases/case.model';
import { User } from '../modules/users/user.model';
import { Role } from '../modules/roles/role.model';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';

const router = Router(); router.use(authenticate);
const uploadDir = path.join(process.cwd(), env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }
});
const handler = (action: (req: any) => Promise<unknown>, status = 200) => async (req: any, res: any, next: any) => { try { res.status(status).json({ success: true, data: await action(req) }); } catch (error) { next(error); } };
const permissionsFor = (req: any) => req.auth?.permissions ?? [];
const caseAccessFilter = (req: any) => {
  const filter: Record<string, unknown> = { isDeleted: false };
  if (!permissionsFor(req).includes('case:read:all')) {
    filter.$or = [
      { assignedPerson: req.user.id },
      { 'legalTeam.userId': req.user.id }
    ];
  }
  return filter;
};
const hearingAccessFilter = (req: any, overrides: Record<string, unknown> = {}) => {
  const filter: Record<string, unknown> = { isDeleted: false, ...overrides };
  if (!permissionsFor(req).includes('case:read:all')) {
    filter.responsiblePerson = req.user.id;
  }
  return filter;
};
const toLabelValue = (items: Array<{ _id: string | null; count: number }>) => items.map((item) => ({ label: item._id || 'Unknown', value: item.count }));
const toDateOnly = (date: Date) => new Date(date).toISOString().slice(0, 10);
const startOfDay = (date: Date) => new Date(date.setHours(0, 0, 0, 0));
const endOfDay = (date: Date) => new Date(date.setHours(23, 59, 59, 999));

router.get('/dashboard/summary', handler(async (req) => {
  const baseFilter = caseAccessFilter(req);
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());
  const [total, active, closed, critical, cmdDecisionsPending, hearingsToday] = await Promise.all([
    Case.countDocuments(baseFilter),
    Case.countDocuments({ ...baseFilter, currentStatus: 'Active' }),
    Case.countDocuments({ ...baseFilter, currentStatus: 'Closed' }),
    Case.countDocuments({ ...baseFilter, isCritical: true }),
    Case.countDocuments({ ...baseFilter, cmdDecisionRequired: true, currentStatus: { $ne: 'Closed' } }),
    Hearing.countDocuments({ isDeleted: false, hearingDate: { $gte: todayStart, $lt: todayEnd } })
  ]);
  return { total, active, closed, critical, cmdDecisionsPending, hearingsToday };
}));

router.get('/dashboard/case-status-distribution', handler(async (req) => {
  const results = await Case.aggregate([
    { $match: { ...caseAccessFilter(req), currentStatus: { $in: ['Active', 'Closed', 'Stayed', 'Other'] } } },
    { $group: { _id: '$currentStatus', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  return toLabelValue(results);
}));

router.get('/dashboard/priority-distribution', handler(async (req) => {
  const results = await Case.aggregate([
    { $match: { ...caseAccessFilter(req), priority: { $in: ['High', 'Medium', 'Low'] } } },
    { $group: { _id: '$priority', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  return toLabelValue(results);
}));

router.get('/dashboard/cases-by-type', handler(async (req) => {
  const results = await Case.aggregate([
    { $match: { ...caseAccessFilter(req), caseType: { $exists: true } } },
    { $group: { _id: '$caseType', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  return toLabelValue(results);
}));

router.get('/dashboard/cases-by-location', handler(async (req) => {
  const results = await Case.aggregate([
    { $match: { ...caseAccessFilter(req), villageLocation: { $ne: null } } },
    { $lookup: { from: 'locations', localField: 'villageLocation', foreignField: '_id', as: 'location' } },
    { $unwind: '$location' },
    { $group: { _id: '$location.name', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  return toLabelValue(results);
}));

router.get('/dashboard/hearings-this-week', handler(async (req) => {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  const filter: Record<string, unknown> = { isDeleted: false, hearingDate: { $gte: start, $lt: end } };
  if (!permissionsFor(req).includes('case:read:all')) {
    filter.responsiblePerson = req.user.id;
  }
  return Hearing.find(filter).populate('caseId', 'caseTitle caseId currentStatus').sort({ hearingDate: 1 }).limit(50);
}));

router.get('/dashboard/hearings-next-week', handler(async (req) => {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay() + 7);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  const filter: Record<string, unknown> = { isDeleted: false, hearingDate: { $gte: start, $lt: end } };
  if (!permissionsFor(req).includes('case:read:all')) {
    filter.responsiblePerson = req.user.id;
  }
  return Hearing.find(filter).populate('caseId', 'caseTitle caseId currentStatus').sort({ hearingDate: 1 }).limit(50);
}));

router.get('/dashboard/critical-cases', handler(async (req) => {
  const filter = caseAccessFilter(req);
  return Case.find({ ...filter, isCritical: true }).populate(['assignedPerson', 'court', 'villageLocation']).sort({ updatedAt: -1 }).limit(20);
}));

router.get('/dashboard/recent-activities', handler(async (req) => {
  const filter = caseAccessFilter(req);
  const recentCases = await Case.find({ ...filter }).select('caseTitle currentStatus priority updatedAt').sort({ updatedAt: -1 }).limit(10).lean();
  return recentCases.map((item) => ({
    type: 'Case',
    title: item.caseTitle,
    status: item.currentStatus,
    priority: item.priority,
    date: (item as any).updatedAt
  }));
}));

router.get('/dashboard/recent-hearing-updates', handler(async (req) => {
  const filter: Record<string, unknown> = { isDeleted: false };
  if (!permissionsFor(req).includes('case:read:all')) {
    filter.responsiblePerson = req.user.id;
  }
  const hearings = await Hearing.find(filter).populate('caseId', 'caseTitle caseId').sort({ updatedAt: -1 }).limit(10).lean();
  return hearings.map((item) => ({
    id: item._id,
    caseTitle: item.caseId && typeof item.caseId === 'object' ? (item.caseId as any).caseTitle : 'Unknown case',
    hearingDate: item.hearingDate,
    status: item.status,
    courtObservation: item.courtObservation,
    updatedAt: (item as any).updatedAt
  }));
}));

router.get('/dashboard/export', async (req: any, res: any, next: any) => {
  try {
    const snapshot = {
      summary: await (async () => {
        const baseFilter = caseAccessFilter(req);
        const todayStart = startOfDay(new Date());
        const todayEnd = endOfDay(new Date());
        const [total, active, closed, critical, cmdDecisionsPending, hearingsToday] = await Promise.all([
          Case.countDocuments(baseFilter),
          Case.countDocuments({ ...baseFilter, currentStatus: 'Active' }),
          Case.countDocuments({ ...baseFilter, currentStatus: 'Closed' }),
          Case.countDocuments({ ...baseFilter, isCritical: true }),
          Case.countDocuments({ ...baseFilter, cmdDecisionRequired: true, currentStatus: { $ne: 'Closed' } }),
          Hearing.countDocuments({ isDeleted: false, hearingDate: { $gte: todayStart, $lt: todayEnd } })
        ]);
        return { total, active, closed, critical, cmdDecisionsPending, hearingsToday };
      })(),
      caseStatusDistribution: await (async () => {
        const results = await Case.aggregate([
          { $match: { ...caseAccessFilter(req), currentStatus: { $in: ['Active', 'Closed', 'Stayed', 'Other'] } } },
          { $group: { _id: '$currentStatus', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]);
        return toLabelValue(results);
      })(),
      priorityDistribution: await (async () => {
        const results = await Case.aggregate([
          { $match: { ...caseAccessFilter(req), priority: { $in: ['High', 'Medium', 'Low'] } } },
          { $group: { _id: '$priority', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]);
        return toLabelValue(results);
      })(),
      casesByType: await (async () => {
        const results = await Case.aggregate([
          { $match: { ...caseAccessFilter(req), caseType: { $exists: true } } },
          { $group: { _id: '$caseType', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]);
        return toLabelValue(results);
      })(),
      casesByLocation: await (async () => {
        const results = await Case.aggregate([
          { $match: { ...caseAccessFilter(req), villageLocation: { $ne: null } } },
          { $lookup: { from: 'locations', localField: 'villageLocation', foreignField: '_id', as: 'location' } },
          { $unwind: '$location' },
          { $group: { _id: '$location.name', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]);
        return toLabelValue(results);
      })(),
      criticalCases: await Case.find({ ...caseAccessFilter(req), isCritical: true }).select('caseId caseTitle currentStatus priority').sort({ updatedAt: -1 }).limit(20).lean(),
      recentActivities: await (async () => {
        const recentCases = await Case.find({ ...caseAccessFilter(req) }).select('caseTitle currentStatus priority updatedAt').sort({ updatedAt: -1 }).limit(10).lean();
        return recentCases.map((item) => ({ type: 'Case', title: item.caseTitle, status: item.currentStatus, priority: item.priority, date: (item as any).updatedAt }));
      })(),
      recentHearingUpdates: await (async () => {
        const filter: Record<string, unknown> = { isDeleted: false };
        if (!permissionsFor(req).includes('case:read:all')) {
          filter.responsiblePerson = req.user.id;
        }
        const hearings = await Hearing.find(filter).populate('caseId', 'caseTitle caseId').sort({ updatedAt: -1 }).limit(10).lean();
        return hearings.map((item) => ({ id: item._id, caseTitle: item.caseId && typeof item.caseId === 'object' ? (item.caseId as any).caseTitle : 'Unknown case', hearingDate: item.hearingDate, status: item.status, updatedAt: (item as any).updatedAt }));
      })()
    };

    res.setHeader('Content-Disposition', 'attachment; filename="dashboard-snapshot.json"');
    res.type('json');
    res.send(JSON.stringify(snapshot, null, 2));
  } catch (error) {
    next(error);
  }
});

const reportDefinitions = [
  { id: 'case-summary', name: 'Case Summary', description: 'Overview of case totals, status, and type mix', category: 'cases' },
  { id: 'hearing-schedule', name: 'Hearing Schedule', description: 'Upcoming hearing timeline across the selected range', category: 'hearings' },
  { id: 'advocate-workload', name: 'Advocate Workload', description: 'Allocation of hearings and case responsibility', category: 'advocates' },
  { id: 'case-status', name: 'Case Status', description: 'Breakdown of cases by status', category: 'cases' },
  { id: 'hearing-outcome', name: 'Hearing Outcome', description: 'Summary of hearing completion and outcomes', category: 'hearings' },
  { id: 'timeline-compliance', name: 'Timeline Compliance', description: 'Progress on required follow-up and deadline tracking', category: 'compliance' },
  { id: 'document-summary', name: 'Document Summary', description: 'Volume and distribution of uploaded documents', category: 'documents' }
];
const recentReports: Array<{ id: string; name: string; type: string; generatedAt: string; params?: Record<string, unknown>; summary?: Record<string, unknown> }> = [];

const buildCustomReport = async (req: any, payload: Record<string, any> = {}) => {
  const type = payload.type || 'case';
  const filter: Record<string, unknown> = { isDeleted: false };
  if (type === 'case') {
    const caseFilter = caseAccessFilter(req);
    const query = { ...caseFilter, ...(payload.filters || {}) };
    const [total, byStatus, byType] = await Promise.all([
      Case.countDocuments(query),
      Case.aggregate([{ $match: query }, { $group: { _id: '$currentStatus', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Case.aggregate([{ $match: query }, { $group: { _id: '$caseType', count: { $sum: 1 } } }, { $sort: { count: -1 } }])
    ]);
    return { total, byStatus: toLabelValue(byStatus), byType: toLabelValue(byType), filters: payload.filters || {} };
  }

  const hearingFilter: Record<string, unknown> = { isDeleted: false, ...(payload.filters || {}) };
  if (!permissionsFor(req).includes('case:read:all')) {
    hearingFilter.responsiblePerson = req.user?.id;
  }
  const [total, byStatus, upcoming] = await Promise.all([
    Hearing.countDocuments(hearingFilter),
    Hearing.aggregate([{ $match: hearingFilter }, { $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Hearing.countDocuments({ ...hearingFilter, hearingDate: { $gte: new Date() } })
  ]);
  return { total, byStatus: toLabelValue(byStatus), upcoming, filters: payload.filters || {} };
};

router.get('/reports/quick', handler(async () => reportDefinitions));

router.get('/reports/case-summary', handler(async (req) => {
  const baseFilter = caseAccessFilter(req);
  const [total, active, closed, archived, byType, byStatus] = await Promise.all([
    Case.countDocuments(baseFilter),
    Case.countDocuments({ ...baseFilter, currentStatus: 'Active' }),
    Case.countDocuments({ ...baseFilter, currentStatus: 'Closed' }),
    Case.countDocuments({ ...baseFilter, isDeleted: true }),
    Case.aggregate([{ $match: baseFilter }, { $group: { _id: '$caseType', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Case.aggregate([{ $match: baseFilter }, { $group: { _id: '$currentStatus', count: { $sum: 1 } } }, { $sort: { count: -1 } }])
  ]);
  return { total, active, closed, archived, byType: toLabelValue(byType), byStatus: toLabelValue(byStatus) };
}));

router.get('/reports/hearing-schedule', async (req, res, next) => {
  try {
    const query = req.query as Record<string, any>;
    const from = query.from ? new Date(query.from) : new Date();
    const to = query.to ? new Date(query.to) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const filter: Record<string, unknown> = hearingAccessFilter(req, { hearingDate: { $gte: from, $lte: to } });
    const hearings = await Hearing.find(filter).populate('caseId', 'caseId caseTitle currentStatus').sort({ hearingDate: 1 });
    res.json({ success: true, data: hearings });
  } catch (error) {
    next(error);
  }
});

router.get('/reports/advocate-workload', handler(async (req) => {
  const match: Record<string, unknown> = { isDeleted: false };
  if (!permissionsFor(req).includes('case:read:all')) {
    match.responsiblePerson = req.user?.id;
  }
  const results = await Hearing.aggregate([
    { $match: match },
    { $group: { _id: '$responsiblePerson', hearings: { $sum: 1 }, cases: { $addToSet: '$caseId' } } },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    { $project: { advocate: { _id: '$user._id', name: '$user.name', email: '$user.email' }, hearings: 1, caseCount: { $size: '$cases' } } }
  ]);
  return results;
}));

router.get('/reports/case-status', handler(async (req) => {
  const results = await Case.aggregate([
    { $match: { ...caseAccessFilter(req), currentStatus: { $exists: true } } },
    { $group: { _id: '$currentStatus', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  return toLabelValue(results);
}));

router.get('/reports/hearing-outcome', handler(async (req) => {
  const match: Record<string, unknown> = { isDeleted: false };
  if (!permissionsFor(req).includes('case:read:all')) {
    match.responsiblePerson = req.user?.id;
  }
  const results = await Hearing.aggregate([
    { $match: match },
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  return toLabelValue(results);
}));

router.get('/reports/timeline-compliance', handler(async (req) => {
  const baseFilter = caseAccessFilter(req);
  const cases = await Case.find({ ...baseFilter, timeline: { $exists: true, $ne: [] } }).select('timeline currentStatus').lean();
  const total = cases.length;
  const compliant = cases.filter((item) => Array.isArray((item as any).timeline) && (item as any).timeline.every((entry: any) => entry.status === 'Completed' || entry.status === 'Closed')).length;
  return {
    total,
    compliant,
    notCompliant: total - compliant,
    complianceRate: total ? Number(((compliant / total) * 100).toFixed(2)) : 0
  };
}));

router.get('/reports/document-summary', handler(async (req) => {
  const results = await DocumentModel.aggregate([
    { $match: { ...(req.user && !permissionsFor(req).includes('case:read:all') ? { uploadedBy: req.user.id } : {}) } },
    { $group: { _id: '$category', count: { $sum: 1 }, totalSize: { $sum: '$fileSizeBytes' } } },
    { $sort: { count: -1 } }
  ]);
  return results.map((item) => ({ label: item._id || 'Uncategorized', count: item.count, totalSize: item.totalSize }));
}));

router.post('/reports/custom', async (req, res, next) => {
  try {
    const payload = (req.body || {}) as Record<string, any>;
    const result = await buildCustomReport(req, payload);
    const reportId = `custom-${Date.now()}`;
    recentReports.unshift({
      id: reportId,
      name: payload.name || 'Custom Report',
      type: payload.type || 'case',
      generatedAt: new Date().toISOString(),
      params: payload,
      summary: result
    });
    res.status(201).json({ success: true, data: { id: reportId, ...result } });
  } catch (error) {
    next(error);
  }
});

router.get('/reports/history', handler(async () => recentReports.slice(0, 20))); 

router.get('/reports/:id/download', async (req, res, next) => {
  try {
    const recentReport = recentReports.find((item) => item.id === req.params.id);
    const quickReport = reportDefinitions.find((item) => item.id === req.params.id);
    const report = recentReport || quickReport;
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }
    const payload = recentReport
      ? recentReport
      : { id: quickReport!.id, name: quickReport!.name, description: quickReport!.description, generatedAt: new Date().toISOString() };
    res.setHeader('Content-Disposition', `attachment; filename="${(report as any).name || report.id}.json"`);
    res.type('json');
    res.send(JSON.stringify(payload, null, 2));
  } catch (error) {
    next(error);
  }
});

router.get('/hearings', async (req, res, next) => {
  try {
    const query = req.query as Record<string, any>;
    const filter: Record<string, any> = hearingAccessFilter(req);

    if (query.status) filter.status = query.status;
    if (query.responsiblePerson) filter.responsiblePerson = query.responsiblePerson;
    if (query.caseId) filter.caseId = query.caseId;

    const fromDate = query.fromDate ?? query.dateRange?.fromDate;
    const toDate = query.toDate ?? query.dateRange?.toDate;
    if (fromDate || toDate) {
      filter.hearingDate = {};
      if (fromDate) filter.hearingDate.$gte = new Date(fromDate);
      if (toDate) filter.hearingDate.$lte = new Date(toDate);
    }

    const data = await Hearing.find(filter).populate('caseId responsiblePerson').sort({ hearingDate: 1 });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/hearings/:id', async (req, res, next) => {
  try {
    const currentUserId = String(req.user?.id ?? '');
    const hearing = await Hearing.findOne({ _id: req.params.id, isDeleted: false });
    if (!hearing) return res.status(404).json({ success: false, message: 'Hearing not found' });
    if (!permissionsFor(req).includes('case:read:all') && String(hearing.responsiblePerson) !== currentUserId) {
      return res.status(403).json({ success: false, message: 'You are not allowed to access this hearing' });
    }
    const data = await hearing.populate('caseId responsiblePerson');
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.put('/hearings/:id', authorize('hearing:create', 'case:update'), async (req, res, next) => {
  try {
    const currentUserId = String(req.user?.id ?? '');
    const hearing = await Hearing.findOne({ _id: req.params.id, isDeleted: false });
    if (!hearing) return res.status(404).json({ success: false, message: 'Hearing not found' });
    if (!permissionsFor(req).includes('case:read:all') && String(hearing.responsiblePerson) !== currentUserId) {
      return res.status(403).json({ success: false, message: 'You are not allowed to update this hearing' });
    }
    const data = await Hearing.findOneAndUpdate({ _id: req.params.id, isDeleted: false }, { ...req.body, updatedAt: new Date() }, { new: true, runValidators: true }).populate('caseId responsiblePerson');
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.delete('/hearings/:id', authorize('hearing:create', 'case:update'), async (req, res, next) => {
  try {
    const currentUserId = String(req.user?.id ?? '');
    const hearing = await Hearing.findOne({ _id: req.params.id, isDeleted: false });
    if (!hearing) return res.status(404).json({ success: false, message: 'Hearing not found' });
    if (!permissionsFor(req).includes('case:read:all') && String(hearing.responsiblePerson) !== currentUserId) {
      return res.status(403).json({ success: false, message: 'You are not allowed to delete this hearing' });
    }
    await Hearing.findOneAndUpdate({ _id: req.params.id }, { isDeleted: true }, { new: true });
    res.json({ success: true, message: 'Hearing deleted' });
  } catch (error) {
    next(error);
  }
});

router.post('/cases/:caseId/hearings', authorize('hearing:create', 'case:update'), async (req, res, next) => {
  try {
    const caseId = String(req.params.caseId ?? '');
    const currentUserId = String(req.user?.id ?? '');
    const caseDoc = await Case.findOne({ _id: caseId, isDeleted: false });
    if (!caseDoc) return res.status(404).json({ success: false, message: 'Case not found' });
    if (!permissionsFor(req).includes('case:read:all') && String(caseDoc.assignedPerson) !== currentUserId && !caseDoc.legalTeam.some((member) => String(member.userId) === currentUserId)) {
      return res.status(403).json({ success: false, message: 'You are not allowed to create hearing for this case' });
    }
    const responsiblePerson = req.body.responsiblePerson ?? (currentUserId || req.user?.id || undefined);
    const data = await Hearing.create({ ...req.body, caseId, responsiblePerson });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/cases/:caseId/hearings', async (req, res, next) => {
  try {
    const caseId = String(req.params.caseId ?? '');
    const currentUserId = String(req.user?.id ?? '');
    const caseDoc = await Case.findOne({ _id: caseId, isDeleted: false });
    if (!caseDoc) return res.status(404).json({ success: false, message: 'Case not found' });
    if (!permissionsFor(req).includes('case:read:all') && String(caseDoc.assignedPerson) !== currentUserId && !caseDoc.legalTeam.some((member) => String(member.userId) === currentUserId)) {
      return res.status(403).json({ success: false, message: 'You are not allowed to view hearings for this case' });
    }
    const data = await Hearing.find({ caseId, isDeleted: false }).sort({ hearingDate: -1 }).populate('caseId responsiblePerson');
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});
router.get('/cases/:caseId/documents', async (req, res, next) => {
  try {
    const caseId = String(req.params.caseId ?? '');
    const caseDoc = await Case.findOne({ _id: caseId, isDeleted: false });
    if (!caseDoc) return res.status(404).json({ success: false, message: 'Case not found' });
    if (!permissionsFor(req).includes('case:read:all') && String(caseDoc.assignedPerson) !== String(req.user?.id ?? '') && !caseDoc.legalTeam.some((member) => String(member.userId) === String(req.user?.id ?? ''))) {
      return res.status(403).json({ success: false, message: 'You are not allowed to view this case documents' });
    }
    const data = await DocumentModel.find({ caseId, isDeleted: false }).sort({ createdAt: -1 });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post('/cases/:caseId/documents', authorize('document:create', 'case:update'), upload.array('files', 20), async (req, res, next) => {
  try {
    const caseId = String(req.params.caseId ?? '');
    const caseDoc = await Case.findOne({ _id: caseId, isDeleted: false });
    if (!caseDoc) return res.status(404).json({ success: false, message: 'Case not found' });
    const files = Array.isArray((req as any).files) ? (req as any).files : [];
    if (!files.length) return res.status(400).json({ success: false, message: 'No files uploaded' });
    const saved = await Promise.all(files.map(async (file: any) => DocumentModel.create({
      caseId,
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSizeBytes: file.size,
      storageUrl: `/uploads/${path.basename(file.path)}`,
      uploadedBy: req.user!.id,
      category: req.body.category || 'general'
    })));
    res.status(201).json({ success: true, data: saved });
  } catch (error) {
    next(error);
  }
});

router.get('/documents/:id/download', async (req, res, next) => {
  try {
    const document = await DocumentModel.findOne({ _id: req.params.id, isDeleted: false });
    if (!document) return res.status(404).json({ success: false, message: 'Document not found' });
    const caseDoc = await Case.findOne({ _id: document.caseId, isDeleted: false });
    if (!caseDoc) return res.status(404).json({ success: false, message: 'Associated case not found' });
    if (!permissionsFor(req).includes('case:read:all') && String(caseDoc.assignedPerson) !== String(req.user?.id ?? '') && !caseDoc.legalTeam.some((member) => String(member.userId) === String(req.user?.id ?? ''))) {
      return res.status(403).json({ success: false, message: 'You are not allowed to download this document' });
    }
    const filePath = path.join(process.cwd(), document.storageUrl.replace(/^\/+/, ''));
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, message: 'File not found on disk' });
    res.download(filePath, document.fileName);
  } catch (error) {
    next(error);
  }
});

router.delete('/documents/:id', authorize('document:create', 'case:update'), async (req, res, next) => {
  try {
    const document = await DocumentModel.findOne({ _id: req.params.id, isDeleted: false });
    if (!document) return res.status(404).json({ success: false, message: 'Document not found' });
    const caseDoc = await Case.findOne({ _id: document.caseId, isDeleted: false });
    if (!caseDoc) return res.status(404).json({ success: false, message: 'Associated case not found' });
    if (!permissionsFor(req).includes('case:read:all') && String(caseDoc.assignedPerson) !== String(req.user?.id ?? '') && !caseDoc.legalTeam.some((member) => String(member.userId) === String(req.user?.id ?? ''))) {
      return res.status(403).json({ success: false, message: 'You are not allowed to delete this document' });
    }
    await DocumentModel.findOneAndUpdate({ _id: req.params.id }, { isDeleted: true }, { new: true });
    const filePath = path.join(process.cwd(), document.storageUrl.replace(/^\/+/, ''));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.json({ success: true, message: 'Document deleted' });
  } catch (error) {
    next(error);
  }
});
router.get('/notifications', async (req, res, next) => {
  try {
    const [items, unreadCount] = await Promise.all([
      Notification.find({ userId: req.user!.id }).sort({ createdAt: -1 }).limit(50).lean(),
      Notification.countDocuments({ userId: req.user!.id, isRead: false })
    ]);
    res.json({ success: true, data: { items, unreadCount } });
  } catch (error) {
    next(error);
  }
});
router.patch('/notifications/:id/read', async (req, res, next) => {
  try {
    const item = await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user!.id }, { isRead: true }, { new: true });
    if (!item) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});
router.patch('/notifications/read-all', async (req, res, next) => {
  try {
    const result = await Notification.updateMany({ userId: req.user!.id, isRead: false }, { isRead: true });
    res.json({ success: true, data: { matched: result.matchedCount, modified: result.modifiedCount } });
  } catch (error) {
    next(error);
  }
});
router.get('/calendar', async (req, res, next) => {
  try {
    const currentUserId = String(req.user?.id ?? '');
    const month = Number(req.query.month) || new Date().getMonth() + 1;
    const year = Number(req.query.year) || new Date().getFullYear();
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const filter: Record<string, unknown> = {
      date: { $gte: start, $lt: end }
    };
    if (!permissionsFor(req).includes('case:read:all')) {
      filter.$or = [
        { createdBy: currentUserId },
        { caseId: { $exists: true } },
        { hearingId: { $exists: true } }
      ];
    }

    const [customEvents, hearings, cases] = await Promise.all([
      CalendarEvent.find(filter).populate('caseId hearingId').sort({ date: 1 }),
      Hearing.find({ isDeleted: false, hearingDate: { $gte: start, $lt: end }, ...(permissionsFor(req).includes('case:read:all') ? {} : { responsiblePerson: currentUserId }) }).populate('caseId responsiblePerson').sort({ hearingDate: 1 }),
      Case.find({ ...caseAccessFilter(req), nextHearingDate: { $gte: start, $lt: end } }).select('caseId caseTitle nextHearingDate createdBy').sort({ nextHearingDate: 1 })
    ]);

    const safeDate = (value?: Date | string | null) => value ? new Date(value) : new Date(0);

    const merged = [
      ...customEvents.map((event) => ({ ...event.toObject(), source: 'calendar' })),
      ...hearings.map((hearing) => ({
        _id: hearing._id,
        title: `${hearing.caseId ? (hearing.caseId as any).caseTitle : 'Hearing'} - ${hearing.status}`,
        type: 'Hearing',
        date: hearing.hearingDate,
        time: hearing.hearingDate ? hearing.hearingDate.toISOString().slice(11, 16) : undefined,
        hearingId: hearing._id,
        caseId: hearing.caseId,
        description: hearing.courtObservation ?? hearing.expectedAction,
        createdBy: hearing.responsiblePerson,
        source: 'hearing'
      })),
      ...cases.map((item) => ({
        _id: item._id,
        title: `Deadline: ${item.caseTitle}`,
        type: 'Deadline',
        date: item.nextHearingDate,
        caseId: item._id,
        description: 'Next hearing date',
        createdBy: item.createdBy,
        source: 'case'
      }))
    ].filter((item) => !!item.date).sort((a, b) => safeDate(a.date).getTime() - safeDate(b.date).getTime());

    res.json({ success: true, data: merged });
  } catch (error) {
    next(error);
  }
});

router.post('/calendar/events', authorize('calendar:manage'), async (req, res, next) => {
  try {
    const data = await CalendarEvent.create({ ...req.body, createdBy: req.user!.id });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.put('/calendar/events/:id', authorize('calendar:manage'), async (req, res, next) => {
  try {
    const data = await CalendarEvent.findOneAndUpdate({ _id: req.params.id }, { ...req.body, updatedAt: new Date() }, { new: true, runValidators: true });
    if (!data) return res.status(404).json({ success: false, message: 'Calendar event not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.delete('/calendar/events/:id', authorize('calendar:manage'), async (req, res, next) => {
  try {
    const deleted = await CalendarEvent.findOneAndDelete({ _id: req.params.id });
    if (!deleted) return res.status(404).json({ success: false, message: 'Calendar event not found' });
    res.json({ success: true, message: 'Calendar event deleted' });
  } catch (error) {
    next(error);
  }
});
const ensureSettings = async (defaults: Record<string, unknown> = {}) => {
  const existing = await Settings.findOneAndUpdate({ singleton: 'default' }, { $setOnInsert: { singleton: 'default', ...defaults } }, { upsert: true, new: true });
  return existing;
};

router.get('/settings/general', authorize('settings:read'), async (req, res, next) => {
  try {
    const settings = await ensureSettings({
      systemName: 'Legal Case MIS',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '12h',
      timezone: 'Asia/Kolkata',
      itemsPerPage: 20,
      darkMode: false,
      compactView: false,
      showCaseId: true,
      showHearingReminders: true
    });
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
});
router.put('/settings/general', authorize('settings:manage'), async (req, res, next) => {
  try {
    const settings = await Settings.findOneAndUpdate({ singleton: 'default' }, { ...req.body, updatedBy: req.user!.id }, { upsert: true, new: true, runValidators: true });
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
});
router.get('/settings/display', authorize('settings:read'), async (req, res, next) => {
  try {
    const settings = await ensureSettings({
      darkMode: false,
      compactView: false,
      showCaseId: true,
      showHearingReminders: true,
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '12h'
    });
    res.json({ success: true, data: {
      darkMode: Boolean(settings.darkMode),
      compactView: Boolean(settings.compactView),
      showCaseId: Boolean(settings.showCaseId),
      showHearingReminders: Boolean(settings.showHearingReminders),
      dateFormat: settings.dateFormat,
      timeFormat: settings.timeFormat
    } });
  } catch (error) {
    next(error);
  }
});
router.put('/settings/display', authorize('settings:manage'), async (req, res, next) => {
  try {
    const settings = await Settings.findOneAndUpdate({ singleton: 'default' }, { ...req.body, updatedBy: req.user!.id }, { upsert: true, new: true, runValidators: true });
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
});
router.get('/settings/notifications', authorize('settings:read'), async (req, res, next) => {
  try {
    const settings = await ensureSettings({ notifications: {} });
    res.json({ success: true, data: { notifications: settings.notifications || {} } });
  } catch (error) {
    next(error);
  }
});
router.put('/settings/notifications', authorize('settings:manage'), async (req, res, next) => {
  try {
    const settings = await Settings.findOneAndUpdate({ singleton: 'default' }, { notifications: req.body?.notifications || {}, updatedBy: req.user!.id }, { upsert: true, new: true, runValidators: true });
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
});
router.get('/settings/security', authorize('settings:read'), async (req, res, next) => {
  try {
    const settings = await ensureSettings({
      passwordExpiryDays: 90,
      sessionTimeoutMinutes: 60,
      twoFactorEnabled: false,
      allowConcurrentSessions: false
    });
    res.json({ success: true, data: {
      passwordExpiryDays: settings.passwordExpiryDays ?? 90,
      sessionTimeoutMinutes: settings.sessionTimeoutMinutes ?? 60,
      twoFactorEnabled: Boolean(settings.twoFactorEnabled),
      allowConcurrentSessions: Boolean(settings.allowConcurrentSessions)
    } });
  } catch (error) {
    next(error);
  }
});
router.put('/settings/security', authorize('settings:manage'), async (req, res, next) => {
  try {
    const settings = await Settings.findOneAndUpdate({ singleton: 'default' }, {
      passwordExpiryDays: req.body?.passwordExpiryDays,
      sessionTimeoutMinutes: req.body?.sessionTimeoutMinutes,
      twoFactorEnabled: Boolean(req.body?.twoFactorEnabled),
      allowConcurrentSessions: Boolean(req.body?.allowConcurrentSessions),
      updatedBy: req.user!.id
    }, { upsert: true, new: true, runValidators: true });
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
});
router.get('/settings/integrations', authorize('settings:read'), async (req, res, next) => {
  try {
    const settings = await ensureSettings({ integrations: {} });
    res.json({ success: true, data: { integrations: settings.integrations || {} } });
  } catch (error) {
    next(error);
  }
});
router.put('/settings/integrations', authorize('settings:manage'), async (req, res, next) => {
  try {
    const settings = await Settings.findOneAndUpdate({ singleton: 'default' }, { integrations: req.body?.integrations || {}, updatedBy: req.user!.id }, { upsert: true, new: true, runValidators: true });
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
});
router.post('/settings/backup', authorize('settings:manage'), async (req, res, next) => {
  try {
    const now = new Date();
    const fileName = `backup-${now.toISOString().replace(/[:.]/g, '-')}.json`;
    const snapshot = {
      exportedAt: now.toISOString(),
      db: {
        settings: await Settings.find({}).lean(),
        users: await require('../modules/users/user.model').User.find({ isDeleted: false }).lean(),
        roles: await require('../modules/roles/role.model').Role.find({}).lean(),
        cases: await require('../modules/cases/case.model').Case.find({ isDeleted: false }).lean(),
        hearings: await require('../modules/hearings/hearing.model').Hearing.find({ isDeleted: false }).lean(),
        documents: await require('../modules/documents/document.model').DocumentModel.find({ isDeleted: false }).lean(),
        calendar: await require('../modules/calendar/calendarEvent.model').CalendarEvent.find({}).lean()
      }
    };
    const exportPath = path.join(process.cwd(), 'backups', fileName);
    fs.mkdirSync(path.dirname(exportPath), { recursive: true });
    fs.writeFileSync(exportPath, JSON.stringify(snapshot, null, 2));
    res.status(201).json({ success: true, data: { fileName, path: exportPath, exportedAt: now.toISOString() } });
  } catch (error) {
    next(error);
  }
});
router.post('/settings/restore', authorize('settings:manage'), async (req, res, next) => {
  try {
    const payload = req.body || {};
    const backupPath = payload.path || payload.filePath;
    if (!backupPath) return res.status(400).json({ success: false, message: 'Backup file path is required' });
    if (!fs.existsSync(backupPath)) return res.status(404).json({ success: false, message: 'Backup file not found' });
    const json = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
    if (json.db?.settings) {
      await Settings.deleteMany({});
      await Settings.insertMany(json.db.settings);
    }
    if (json.db?.roles) {
      await require('../modules/roles/role.model').Role.deleteMany({});
      await require('../modules/roles/role.model').Role.insertMany(json.db.roles);
    }
    if (json.db?.users) {
      await require('../modules/users/user.model').User.deleteMany({});
      await require('../modules/users/user.model').User.insertMany(json.db.users);
    }
    res.json({ success: true, data: { restored: true, file: backupPath } });
  } catch (error) {
    next(error);
  }
});
router.get('/settings/audit-logs', authorize('settings:read'), async (req, res, next) => {
  try {
    const query = req.query as Record<string, any>;
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const skip = (page - 1) * limit;
    const filters: Record<string, any> = {};
    if (query.userId) filters.userId = query.userId;
    if (query.action) filters.action = query.action;
    if (query.entity) filters.entity = query.entity;
    if (query.from || query.to) {
      filters.createdAt = {};
      if (query.from) filters.createdAt.$gte = new Date(query.from);
      if (query.to) filters.createdAt.$lte = new Date(query.to);
    }
    const [items, total] = await Promise.all([
      Notification.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Notification.countDocuments(filters)
    ]);
    res.json({ success: true, data: { items, page, limit, total, pages: Math.ceil(total / limit) || 1 } });
  } catch (error) {
    next(error);
  }
});

const getUserStats = async () => {
  const adminRoles = await Role.find({ name: { $in: ['Super Admin', 'Administrator'] } }).select('_id').lean();
  const adminRoleIds = adminRoles.map((role) => role._id);
  const [total, active, inactive, admins, standardUsers] = await Promise.all([
    User.countDocuments({ isDeleted: false }),
    User.countDocuments({ isDeleted: false, status: 'active' }),
    User.countDocuments({ isDeleted: false, status: 'inactive' }),
    User.countDocuments({ isDeleted: false, role: { $in: adminRoleIds } }),
    User.countDocuments({ isDeleted: false, role: { $nin: adminRoleIds } })
  ]);
  return { total, active, inactive, admins, standardUsers };
};

router.get('/roles', authorize('user:manage'), handler(async () => Role.find().sort({ createdAt: -1 })));
router.post('/roles', authorize('user:manage'), async (req, res, next) => {
  try {
    const payload = req.body || {};
    const name = String(payload.name || '').trim();
    if (!name) return res.status(400).json({ success: false, message: 'Role name is required' });
    const exists = await Role.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (exists) return res.status(409).json({ success: false, message: 'Role already exists' });
    const role = await Role.create({
      name,
      permissions: Array.isArray(payload.permissions) ? payload.permissions : [],
      isSystemRole: Boolean(payload.isSystemRole)
    });
    res.status(201).json({ success: true, data: role });
  } catch (error) {
    next(error);
  }
});
router.put('/roles/:id', authorize('user:manage'), async (req, res, next) => {
  try {
    const payload = req.body || {};
    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).json({ success: false, message: 'Role not found' });
    if (payload.name) role.name = String(payload.name).trim();
    if (Array.isArray(payload.permissions)) role.permissions = payload.permissions;
    if (typeof payload.isSystemRole === 'boolean') role.isSystemRole = payload.isSystemRole;
    await role.save();
    res.json({ success: true, data: role });
  } catch (error) {
    next(error);
  }
});
router.delete('/roles/:id', authorize('user:manage'), async (req, res, next) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).json({ success: false, message: 'Role not found' });
    if (role.isSystemRole) return res.status(403).json({ success: false, message: 'System roles cannot be deleted' });
    await Role.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Role deleted' });
  } catch (error) {
    next(error);
  }
});

router.get('/users', authorize('user:manage'), async (req, res, next) => {
  try {
    const users = await User.find({ isDeleted: false }).populate('role').select('-passwordHash').sort({ createdAt: -1 });
    const stats = await getUserStats();
    res.json({ success: true, data: { stats, users } });
  } catch (error) {
    next(error);
  }
});
router.get('/users/:id', authorize('user:manage'), async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.params.id, isDeleted: false }).populate('role').select('-passwordHash');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});
router.post('/users', authorize('user:manage'), async (req, res, next) => {
  try {
    const payload = req.body || {};
    const name = String(payload.name || '').trim();
    const email = String(payload.email || '').trim().toLowerCase();
    const username = String(payload.username || '').trim().toLowerCase();
    const password = String(payload.password || 'Welcome@123');
    if (!name || !email || !username) return res.status(400).json({ success: false, message: 'Name, email and username are required' });
    const exists = await User.findOne({ $or: [{ email }, { username }], isDeleted: false });
    if (exists) return res.status(409).json({ success: false, message: 'A user with this email or username already exists' });

    const roleValue = payload.role;
    let roleDoc = null;
    if (roleValue) {
      roleDoc = await Role.findOne({ $or: [{ _id: roleValue }, { name: String(roleValue) }] });
    }
    if (!roleDoc) roleDoc = await Role.findOne({ name: 'Standard User' });
    if (!roleDoc) return res.status(404).json({ success: false, message: 'Default user role not found' });

    const user = await User.create({
      name,
      email,
      username,
      passwordHash: await bcrypt.hash(password, 12),
      role: roleDoc._id,
      designation: payload.designation,
      phone: payload.phone,
      status: payload.status === 'inactive' ? 'inactive' : 'active',
      isDeleted: false,
      createdBy: req.user?.id
    });

    const populated = await User.findById(user._id).populate('role').select('-passwordHash');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
});
router.put('/users/:id', authorize('user:manage'), async (req, res, next) => {
  try {
    const payload = req.body || {};
    const user = await User.findOne({ _id: req.params.id, isDeleted: false });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (payload.name) user.name = String(payload.name).trim();
    if (payload.email) user.email = String(payload.email).trim().toLowerCase();
    if (payload.username) user.username = String(payload.username).trim().toLowerCase();
    if (payload.designation !== undefined) user.designation = payload.designation;
    if (payload.phone !== undefined) user.phone = payload.phone;
    if (payload.status) user.status = payload.status === 'inactive' ? 'inactive' : 'active';
    if (payload.role) {
      const roleDoc = await Role.findOne({ $or: [{ _id: payload.role }, { name: String(payload.role) }] });
      if (!roleDoc) return res.status(404).json({ success: false, message: 'Role not found' });
      user.role = roleDoc._id;
    }
    if (payload.password) user.passwordHash = await bcrypt.hash(String(payload.password), 12);
    await user.save();
    const populated = await User.findById(user._id).populate('role').select('-passwordHash');
    res.json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
});
router.patch('/users/:id/status', authorize('user:manage'), async (req, res, next) => {
  try {
    const status = String(req.body?.status || '').toLowerCase();
    if (!['active', 'inactive'].includes(status)) return res.status(400).json({ success: false, message: 'Status must be active or inactive' });
    const user = await User.findOneAndUpdate({ _id: req.params.id, isDeleted: false }, { status }, { new: true }).populate('role').select('-passwordHash');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});
router.delete('/users/:id', authorize('user:manage'), async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.params.id, isDeleted: false });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.isDeleted = true;
    user.status = 'inactive';
    await user.save();
    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    next(error);
  }
});
router.post('/users/admin', authorize('user:manage'), async (req, res, next) => {
  try {
    const currentUser = await User.findById(req.user!.id);
    const currentRole = currentUser ? await Role.findById(currentUser.role) : null;
    if (!currentRole || currentRole.name !== 'Super Admin') {
      throw new ApiError(403, 'Only Super Admin can create admin users');
    }

    const adminRole = await Role.findOne({ name: 'Administrator' });
    if (!adminRole) {
      throw new ApiError(500, 'Administrator role is not configured');
    }

    const items = Array.isArray(req.body) ? req.body : [req.body];
    if (!items.length) {
      throw new ApiError(400, 'No admin users provided');
    }

    const created = await Promise.all(items.map(async (item, index) => {
      const name = String(item.name || `Admin ${index + 1}`);
      const username = String(item.username || `admin-${Date.now()}-${index + 1}`);
      const email = String(item.email || `${username}@example.com`);
      const password = String(item.password || env.SEED_ADMIN_PASSWORD);

      const exists = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }], isDeleted: false });
      if (exists) {
        throw new ApiError(409, `User with email '${email}' or username '${username}' already exists`);
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await User.create({
        name,
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        passwordHash,
        role: adminRole._id,
        status: 'active',
        isDeleted: false
      });

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: 'admin'
      };
    }));

    res.status(201).json({ success: true, data: created.length === 1 ? created[0] : created });
  } catch (error) {
    next(error);
  }
});
const getLookupCollection = (name: string) => mongooseModel(name);
const buildLookupPayload = (body: any, type?: string) => ({
  name: String(body?.name || '').trim(),
  type,
  location: body?.location ? String(body.location).trim() : undefined,
  district: body?.district ? String(body.district).trim() : undefined,
  state: body?.state ? String(body.state).trim() : undefined
});

router.get('/lookups/courts', handler(async () => getLookupCollection('Court').find().sort({ name: 1 })));
router.post('/lookups/courts', async (req, res, next) => {
  try {
    const payload = buildLookupPayload(req.body, 'court');
    if (!payload.name) return res.status(400).json({ success: false, message: 'Court name is required' });
    const exists = await getLookupCollection('Court').findOne({ name: { $regex: new RegExp(`^${payload.name}$`, 'i') } });
    if (exists) return res.status(409).json({ success: false, message: 'Court already exists' });
    const item = await getLookupCollection('Court').create(payload);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});
router.get('/lookups/locations', handler(async () => getLookupCollection('Location').find().sort({ name: 1 })));
router.post('/lookups/locations', async (req, res, next) => {
  try {
    const payload = buildLookupPayload(req.body, 'location');
    if (!payload.name) return res.status(400).json({ success: false, message: 'Location name is required' });
    const exists = await getLookupCollection('Location').findOne({ name: { $regex: new RegExp(`^${payload.name}$`, 'i') } });
    if (exists) return res.status(409).json({ success: false, message: 'Location already exists' });
    const item = await getLookupCollection('Location').create(payload);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
});
router.get('/lookups/case-types', async (req, res, next) => {
  try {
    const items = await mongooseModel('Lookup').find({ type: { $in: ['case-type', 'caseType'] } }).sort({ name: 1 }).lean();
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
});
router.get('/lookups/practice-areas', async (req, res, next) => {
  try {
    const items = await mongooseModel('Lookup').find({ type: { $in: ['practice-area', 'practiceArea'] } }).sort({ name: 1 }).lean();
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
});
router.get('/search', async (req, res, next) => {
  try {
    const q = String(req.query.q ?? '').trim();
    if (!q) {
      return res.json({ success: true, data: { query: '', cases: [], hearings: [], courts: [], locations: [], users: [] } });
    }

    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const [cases, hearings, courts, locations, users] = await Promise.all([
      Case.find({ ...caseAccessFilter(req), $or: [{ caseTitle: regex }, { caseId: regex }, { plaintiff: regex }, { defendant: regex }, { remarks: regex }] }).populate(['court', 'villageLocation', 'assignedPerson']).limit(10).lean(),
      Hearing.find({ ...hearingAccessFilter(req), $or: [{ courtObservation: regex }, { expectedAction: regex }, { hearingOutcome: regex }, { status: regex }] }).populate(['caseId', 'responsiblePerson']).limit(10).lean(),
      mongooseModel('Court').find({ name: regex }).limit(10).lean(),
      mongooseModel('Location').find({ name: regex }).limit(10).lean(),
      User.find({ isDeleted: false, $or: [{ name: regex }, { email: regex }, { username: regex }] }).select('-passwordHash').limit(10).lean()
    ]);

    res.json({ success: true, data: { query: q, cases, hearings, courts, locations, users } });
  } catch (error) {
    next(error);
  }
});
function mongooseModel(name: string) { return require('mongoose').model(name); }
export default router;