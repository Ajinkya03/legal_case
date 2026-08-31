import { Router, RequestHandler } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { Case } from './case.model';
import {
  appendCaseTimeline,
  buildCaseExcelCsv,
  buildCasePdf,
  createCase,
  deleteCase,
  getCase,
  getCaseTimeline,
  listCases,
  updateCase,
  updateCaseStatus
} from './case.service';

const router = Router();
router.use(authenticate);
const permissions = (req: Parameters<RequestHandler>[0]) => req.auth?.permissions ?? [];

router.get('/', async (req, res, next) => {
  try {
    const data = await listCases(req.user!.id, permissions(req), req.query as Record<string, unknown>);
    res.json({ success: true, ...data });
  } catch (error) {
    next(error);
  }
});

router.get('/export/excel', async (req, res, next) => {
  try {
    const data = await listCases(req.user!.id, permissions(req), req.query as Record<string, unknown>);
    const csv = buildCaseExcelCsv(data.data as any[]);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="cases.csv"');
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

router.get('/export/pdf', async (req, res, next) => {
  try {
    const data = await listCases(req.user!.id, permissions(req), req.query as Record<string, unknown>);
    const pdf = buildCasePdf(data.data as any[]);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="cases.pdf"');
    res.send(pdf);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const data = await getCase(req.params.id, req.user!.id, permissions(req));
    if (!data) return res.status(404).json({ success: false, message: 'Case not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post('/', authorize('case:create'), async (req, res, next) => {
  try {
    const data = await createCase(req.body, req.user!.id);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authorize('case:update'), async (req, res, next) => {
  try {
    const caseId = String(req.params.id ?? '');
    const data = await updateCase(caseId, req.user!.id, req.body);
    if (!data) return res.status(404).json({ success: false, message: 'Case not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/status', authorize('case:update'), async (req, res, next) => {
  try {
    const caseId = String(req.params.id ?? '');
    const data = await updateCaseStatus(caseId, req.user!.id, String(req.body?.currentStatus ?? ''));
    if (!data) return res.status(404).json({ success: false, message: 'Case not found' });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authorize('case:delete'), async (req, res, next) => {
  try {
    const caseId = String(req.params.id ?? '');
    const data = await deleteCase(caseId, req.user!.id);
    if (!data) return res.status(404).json({ success: false, message: 'Case not found' });
    res.json({ success: true, message: 'Case deleted' });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/timeline', async (req, res, next) => {
  try {
    const caseId = String(req.params.id ?? '');
    const data = await getCaseTimeline(caseId, req.user!.id, permissions(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/timeline', authorize('case:update'), async (req, res, next) => {
  try {
    const caseId = String(req.params.id ?? '');
    const data = await appendCaseTimeline(caseId, req.user!.id, permissions(req), req.body || {});
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/export/pdf', async (req, res, next) => {
  try {
    const caseId = String(req.params.id ?? '');
    const data = await getCase(caseId, req.user!.id, permissions(req));
    if (!data) return res.status(404).json({ success: false, message: 'Case not found' });
    const pdf = buildCasePdf([data.toObject ? data.toObject() : data]);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="case-${data.caseId}.pdf"`);
    res.send(pdf);
  } catch (error) {
    next(error);
  }
});

export default router;