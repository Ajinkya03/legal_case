import { Types } from 'mongoose';
import { Case, ICase } from './case.model';
import { paginate } from '../../utils/pagination';

export function buildCaseFilter(userId: string, permissions: string[], query: Record<string, unknown>) {
  const filter: Record<string, unknown> = { isDeleted: false };
  if (!permissions.includes('case:read:all')) {
    filter.$or = [{ assignedPerson: userId }, { 'legalTeam.userId': userId }];
  }

  const status = typeof query.status === 'string' ? query.status : undefined;
  const priority = typeof query.priority === 'string' ? query.priority : undefined;
  const type = typeof query.type === 'string' ? query.type : undefined;
  const court = typeof query.court === 'string' ? query.court : undefined;
  const location = typeof query.location === 'string' ? query.location : undefined;
  const search = typeof query.search === 'string' ? query.search.trim() : undefined;

  if (status) filter.currentStatus = status;
  if (priority) filter.priority = priority;
  if (type) filter.caseType = type;
  if (court) filter.court = court;
  if (location) filter.villageLocation = location;

  const dateRange = query.dateRange;
  const fromDate = typeof query.fromDate === 'string' ? query.fromDate : typeof (dateRange as any)?.fromDate === 'string' ? (dateRange as any).fromDate : undefined;
  const toDate = typeof query.toDate === 'string' ? query.toDate : typeof (dateRange as any)?.toDate === 'string' ? (dateRange as any).toDate : undefined;

  if (fromDate || toDate) {
    const filingDate: Record<string, Date> = {};
    if (fromDate) filingDate.$gte = new Date(fromDate);
    if (toDate) filingDate.$lte = new Date(toDate);
    filter.filingDate = filingDate;
  }

  if (search) filter.$text = { $search: search };
  return filter;
}

export async function listCases(userId: string, permissions: string[], query: Record<string, unknown>) {
  const filter = buildCaseFilter(userId, permissions, query);
  return paginate(Case, filter, query, ['assignedPerson', 'court', 'villageLocation']);
}

export async function getCase(id: string, userId: string, permissions: string[]) {
  const filter: Record<string, unknown> = { _id: id, isDeleted: false };
  if (!permissions.includes('case:read:all')) filter.$or = [{ assignedPerson: userId }, { 'legalTeam.userId': userId }];
  return Case.findOne(filter).populate(['assignedPerson', 'court', 'villageLocation']);
}

export async function createCase(input: Partial<ICase>, userId: string) {
  const year = new Date().getFullYear();
  const count = await Case.countDocuments({ createdAt: { $gte: new Date(`${year}-01-01`) } });
  const created = await Case.create({
    ...input,
    caseId: `LC-${year}-${String(count + 1).padStart(4, '0')}`,
    createdBy: new Types.ObjectId(userId),
    assignedPerson: input.assignedPerson ?? userId,
    timeline: [{
      type: 'system',
      description: 'Case created',
      createdBy: new Types.ObjectId(userId),
      createdAt: new Date()
    }]
  });
  return created.populate(['assignedPerson', 'court', 'villageLocation']);
}

export async function updateCase(id: string, userId: string, updates: Partial<ICase>) {
  const { _id, isDeleted, createdBy, createdAt, updatedAt, ...safeUpdates } = updates;
  const caseDocument = await Case.findOneAndUpdate(
    { _id: id, isDeleted: false },
    {
      ...safeUpdates,
      updatedBy: new Types.ObjectId(userId),
      $push: {
        timeline: {
          type: 'update',
          description: 'Case updated',
          createdBy: new Types.ObjectId(userId),
          createdAt: new Date()
        }
      }
    },
    { new: true, runValidators: true }
  ).populate(['assignedPerson', 'court', 'villageLocation']);
  return caseDocument;
}

export async function deleteCase(id: string, userId: string) {
  return Case.findOneAndUpdate(
    { _id: id, isDeleted: false },
    {
      isDeleted: true,
      updatedBy: new Types.ObjectId(userId),
      $push: {
        timeline: {
          type: 'delete',
          description: 'Case marked as deleted',
          createdBy: new Types.ObjectId(userId),
          createdAt: new Date()
        }
      }
    },
    { new: true }
  );
}

export async function updateCaseStatus(id: string, userId: string, status: string) {
  return Case.findOneAndUpdate(
    { _id: id, isDeleted: false },
    {
      currentStatus: status,
      updatedBy: new Types.ObjectId(userId),
      $push: {
        timeline: {
          type: 'status',
          description: `Status updated to ${status}`,
          createdBy: new Types.ObjectId(userId),
          createdAt: new Date()
        }
      }
    },
    { new: true, runValidators: true }
  ).populate(['assignedPerson', 'court', 'villageLocation']);
}

export async function getCaseTimeline(id: string, userId: string, permissions: string[]) {
  const doc = await getCase(id, userId, permissions);
  if (!doc) return [];
  return (doc.timeline ?? []).sort((a, b) => new Date(b.createdAt ?? Date.now()).getTime() - new Date(a.createdAt ?? Date.now()).getTime());
}

export async function appendCaseTimeline(id: string, userId: string, permissions: string[], payload: { type?: string; description?: string }) {
  const caseDoc = await getCase(id, userId, permissions);
  if (!caseDoc) throw new Error('Case not found');
  const item = {
    type: payload.type ?? 'manual',
    description: payload.description ?? 'Timeline event added',
    createdBy: new Types.ObjectId(userId),
    createdAt: new Date()
  };
  caseDoc.timeline = [...(caseDoc.timeline ?? []), item];
  await caseDoc.save();
  return item;
}

export function buildCaseExcelCsv(cases: any[]) {
  const rows = cases.map((item) => [
    item.caseId ?? '',
    item.caseTitle ?? '',
    item.caseType ?? '',
    item.currentStatus ?? '',
    item.priority ?? '',
    item.plaintiff ?? '',
    item.defendant ?? '',
    item.filingDate ? new Date(item.filingDate).toISOString().slice(0, 10) : '',
    item.assignedPerson?.name ?? '',
    item.court?.name ?? '',
    item.villageLocation?.name ?? ''
  ]);
  const header = ['Case ID', 'Title', 'Type', 'Status', 'Priority', 'Plaintiff', 'Defendant', 'Filing Date', 'Assigned Person', 'Court', 'Location'];
  const lines = [header, ...rows].map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','));
  return lines.join('\n');
}

export function buildCasePdf(cases: any[]) {
  const lines = [
    'Legal Case MIS Report',
    '====================',
    ...cases.map((item) => `${item.caseId} | ${item.caseTitle} | ${item.currentStatus} | ${item.priority}`)
  ];
  const body = lines.map((line) => `BT /F1 12 Tf 50 ${760 - lines.indexOf(line) * 18} Td (${escapePdfText(line)}) Tj ET`).join('\n');
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${body.length} >>\nstream\n${body}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n'
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += object;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'binary');
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}