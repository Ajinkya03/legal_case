"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authenticate_1 = require("../../middleware/authenticate");
const authorize_1 = require("../../middleware/authorize");
const case_service_1 = require("./case.service");
const router = (0, express_1.Router)();
router.use(authenticate_1.authenticate);
const permissions = (req) => req.auth?.permissions ?? [];
router.get('/', async (req, res, next) => {
    try {
        const data = await (0, case_service_1.listCases)(req.user.id, permissions(req), req.query);
        res.json({ success: true, ...data });
    }
    catch (error) {
        next(error);
    }
});
router.get('/export/excel', async (req, res, next) => {
    try {
        const data = await (0, case_service_1.listCases)(req.user.id, permissions(req), req.query);
        const csv = (0, case_service_1.buildCaseExcelCsv)(data.data);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="cases.csv"');
        res.send(csv);
    }
    catch (error) {
        next(error);
    }
});
router.get('/export/pdf', async (req, res, next) => {
    try {
        const data = await (0, case_service_1.listCases)(req.user.id, permissions(req), req.query);
        const pdf = (0, case_service_1.buildCasePdf)(data.data);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="cases.pdf"');
        res.send(pdf);
    }
    catch (error) {
        next(error);
    }
});
router.get('/:id', async (req, res, next) => {
    try {
        const data = await (0, case_service_1.getCase)(req.params.id, req.user.id, permissions(req));
        if (!data)
            return res.status(404).json({ success: false, message: 'Case not found' });
        res.json({ success: true, data });
    }
    catch (error) {
        next(error);
    }
});
router.post('/', (0, authorize_1.authorize)('case:create'), async (req, res, next) => {
    try {
        const data = await (0, case_service_1.createCase)(req.body, req.user.id, permissions(req));
        res.status(201).json({ success: true, data });
    }
    catch (error) {
        next(error);
    }
});
router.put('/:id', (0, authorize_1.authorize)('case:update'), async (req, res, next) => {
    try {
        const caseId = String(req.params.id ?? '');
        const data = await (0, case_service_1.updateCase)(caseId, req.user.id, permissions(req), req.body);
        if (!data)
            return res.status(404).json({ success: false, message: 'Case not found' });
        res.json({ success: true, data });
    }
    catch (error) {
        next(error);
    }
});
router.patch('/:id/status', (0, authorize_1.authorize)('case:update'), async (req, res, next) => {
    try {
        const caseId = String(req.params.id ?? '');
        const data = await (0, case_service_1.updateCaseStatus)(caseId, req.user.id, permissions(req), String(req.body?.currentStatus ?? ''));
        if (!data)
            return res.status(404).json({ success: false, message: 'Case not found' });
        res.json({ success: true, data });
    }
    catch (error) {
        next(error);
    }
});
router.delete('/:id', (0, authorize_1.authorize)('case:delete'), async (req, res, next) => {
    try {
        const caseId = String(req.params.id ?? '');
        const data = await (0, case_service_1.deleteCase)(caseId, req.user.id, permissions(req));
        if (!data)
            return res.status(404).json({ success: false, message: 'Case not found' });
        res.json({ success: true, message: 'Case deleted' });
    }
    catch (error) {
        next(error);
    }
});
router.get('/:id/timeline', async (req, res, next) => {
    try {
        const caseId = String(req.params.id ?? '');
        const data = await (0, case_service_1.getCaseTimeline)(caseId, req.user.id, permissions(req));
        res.json({ success: true, data });
    }
    catch (error) {
        next(error);
    }
});
router.post('/:id/timeline', (0, authorize_1.authorize)('case:update'), async (req, res, next) => {
    try {
        const caseId = String(req.params.id ?? '');
        const data = await (0, case_service_1.appendCaseTimeline)(caseId, req.user.id, permissions(req), req.body || {});
        res.status(201).json({ success: true, data });
    }
    catch (error) {
        next(error);
    }
});
router.get('/:id/export/pdf', async (req, res, next) => {
    try {
        const caseId = String(req.params.id ?? '');
        const data = await (0, case_service_1.getCase)(caseId, req.user.id, permissions(req));
        if (!data)
            return res.status(404).json({ success: false, message: 'Case not found' });
        const pdf = (0, case_service_1.buildCasePdf)([data.toObject ? data.toObject() : data]);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="case-${data.caseId}.pdf"`);
        res.send(pdf);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
