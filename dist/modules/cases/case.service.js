"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCaseAccessFilter = buildCaseAccessFilter;
exports.buildCaseFilter = buildCaseFilter;
exports.listCases = listCases;
exports.getCase = getCase;
exports.createCase = createCase;
exports.updateCase = updateCase;
exports.deleteCase = deleteCase;
exports.updateCaseStatus = updateCaseStatus;
exports.getCaseTimeline = getCaseTimeline;
exports.appendCaseTimeline = appendCaseTimeline;
exports.buildCaseExcelCsv = buildCaseExcelCsv;
exports.buildCasePdf = buildCasePdf;
const mongoose_1 = require("mongoose");
const case_model_1 = require("./case.model");
const pagination_1 = require("../../utils/pagination");
const document_model_1 = require("../documents/document.model");
function buildCaseAccessFilter(userId, permissions) {
    const filter = { isDeleted: false };
    if (!permissions.includes('case:read:all')) {
        filter.$or = [{ assignedPerson: userId }, { 'legalTeam.userId': userId }];
    }
    return filter;
}
function buildCaseFilter(userId, permissions, query) {
    const filter = buildCaseAccessFilter(userId, permissions);
    const status = typeof query.status === 'string' ? query.status : undefined;
    const priority = typeof query.priority === 'string' ? query.priority : undefined;
    const type = typeof query.type === 'string' ? query.type : undefined;
    const court = typeof query.court === 'string' ? query.court : undefined;
    const location = typeof query.location === 'string' ? query.location : undefined;
    const search = typeof query.search === 'string' ? query.search.trim() : undefined;
    if (status)
        filter.currentStatus = status;
    if (priority)
        filter.priority = priority;
    if (type)
        filter.caseType = type;
    if (court)
        filter.court = court;
    if (location)
        filter.villageLocation = location;
    const dateRange = query.dateRange;
    const fromDate = typeof query.fromDate === 'string' ? query.fromDate : typeof dateRange?.fromDate === 'string' ? dateRange.fromDate : undefined;
    const toDate = typeof query.toDate === 'string' ? query.toDate : typeof dateRange?.toDate === 'string' ? dateRange.toDate : undefined;
    if (fromDate || toDate) {
        const filingDate = {};
        if (fromDate)
            filingDate.$gte = new Date(fromDate);
        if (toDate)
            filingDate.$lte = new Date(toDate);
        filter.filingDate = filingDate;
    }
    if (search)
        filter.$text = { $search: search };
    return filter;
}
async function listCases(userId, permissions, query) {
    const filter = buildCaseFilter(userId, permissions, query);
    return (0, pagination_1.paginate)(case_model_1.Case, filter, query, [
        'assignedPerson',
        'court',
        'villageLocation',
        'legalTeam.userId',
        'createdBy',
        'updatedBy',
        'timeline.createdBy'
    ]);
}
async function getCase(id, userId, permissions) {
    const filter = { ...buildCaseAccessFilter(userId, permissions), _id: id };
    const caseDocument = await case_model_1.Case.findOne(filter).populate([
        'assignedPerson',
        'court',
        'villageLocation',
        'legalTeam.userId',
        'createdBy',
        'updatedBy',
        'timeline.createdBy'
    ]);
    if (!caseDocument)
        return null;
    const documents = await document_model_1.DocumentModel.find({
        caseId: caseDocument._id,
        isDeleted: false
    }).populate('uploadedBy').sort({ createdAt: -1 });
    const caseWithDocuments = caseDocument;
    caseWithDocuments.documents = documents;
    return caseWithDocuments;
}
async function createCase(input, userId, permissions) {
    const year = new Date().getFullYear();
    const count = await case_model_1.Case.countDocuments({ createdAt: { $gte: new Date(`${year}-01-01`) } });
    const caseInput = input;
    const canReadAll = permissions.includes('case:read:all');
    const created = await case_model_1.Case.create({
        ...caseInput,
        assignedPerson: canReadAll ? caseInput.assignedPerson ?? caseInput.assignedPersonId ?? userId : userId,
        legalTeam: canReadAll ? caseInput.legalTeam : [],
        tags: caseInput.tags ?? caseInput.keywords ?? [],
        keywords: caseInput.keywords ?? caseInput.tags ?? [],
        caseId: `LC-${year}-${String(count + 1).padStart(4, '0')}`,
        createdBy: new mongoose_1.Types.ObjectId(userId),
        timeline: [{
                type: 'system',
                description: 'Case created',
                createdBy: new mongoose_1.Types.ObjectId(userId),
                createdAt: new Date()
            }]
    });
    return created.populate(['assignedPerson', 'court', 'villageLocation']);
}
async function updateCase(id, userId, permissions, updates) {
    const updateInput = updates;
    const { _id, isDeleted, createdBy, createdAt, updatedAt, assignedPersonId, assignedPerson, legalTeam, ...safeUpdates } = updateInput;
    const normalizedUpdates = { ...safeUpdates };
    if (permissions.includes('case:read:all')) {
        if (assignedPersonId !== undefined && assignedPerson === undefined) {
            normalizedUpdates.assignedPerson = assignedPersonId;
        }
        else if (assignedPerson !== undefined) {
            normalizedUpdates.assignedPerson = assignedPerson;
        }
        if (legalTeam !== undefined)
            normalizedUpdates.legalTeam = legalTeam;
    }
    if (normalizedUpdates.tags !== undefined && normalizedUpdates.keywords === undefined) {
        normalizedUpdates.keywords = normalizedUpdates.tags;
    }
    if (normalizedUpdates.keywords !== undefined && normalizedUpdates.tags === undefined) {
        normalizedUpdates.tags = normalizedUpdates.keywords;
    }
    const caseDocument = await case_model_1.Case.findOneAndUpdate({ ...buildCaseAccessFilter(userId, permissions), _id: id }, {
        $set: {
            ...normalizedUpdates,
            updatedBy: new mongoose_1.Types.ObjectId(userId)
        },
        $push: {
            timeline: {
                type: 'update',
                description: 'Case updated',
                createdBy: new mongoose_1.Types.ObjectId(userId),
                createdAt: new Date()
            }
        }
    }, { new: true, runValidators: true }).populate(['assignedPerson', 'court', 'villageLocation']);
    return caseDocument;
}
async function deleteCase(id, userId, permissions) {
    return case_model_1.Case.findOneAndUpdate({ ...buildCaseAccessFilter(userId, permissions), _id: id }, {
        isDeleted: true,
        updatedBy: new mongoose_1.Types.ObjectId(userId),
        $push: {
            timeline: {
                type: 'delete',
                description: 'Case marked as deleted',
                createdBy: new mongoose_1.Types.ObjectId(userId),
                createdAt: new Date()
            }
        }
    }, { new: true });
}
async function updateCaseStatus(id, userId, permissions, status) {
    return case_model_1.Case.findOneAndUpdate({ ...buildCaseAccessFilter(userId, permissions), _id: id }, {
        currentStatus: status,
        updatedBy: new mongoose_1.Types.ObjectId(userId),
        $push: {
            timeline: {
                type: 'status',
                description: `Status updated to ${status}`,
                createdBy: new mongoose_1.Types.ObjectId(userId),
                createdAt: new Date()
            }
        }
    }, { new: true, runValidators: true }).populate(['assignedPerson', 'court', 'villageLocation']);
}
async function getCaseTimeline(id, userId, permissions) {
    const doc = await getCase(id, userId, permissions);
    if (!doc)
        return [];
    return [...(doc.timeline ?? [])]
        .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
        .map((item) => {
        const timelineItem = typeof item.toObject === 'function'
            ? item.toObject()
            : item;
        return { ...timelineItem, date: timelineItem.createdAt };
    });
}
async function appendCaseTimeline(id, userId, permissions, payload) {
    const caseDoc = await getCase(id, userId, permissions);
    if (!caseDoc)
        throw new Error('Case not found');
    const item = {
        type: payload.type ?? 'manual',
        description: payload.description ?? 'Timeline event added',
        createdBy: new mongoose_1.Types.ObjectId(userId),
        createdAt: payload.date ? new Date(payload.date) : new Date()
    };
    caseDoc.timeline = [...(caseDoc.timeline ?? []), item];
    await caseDoc.save();
    return { ...item, date: item.createdAt };
}
function buildCaseExcelCsv(cases) {
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
function buildCasePdf(cases) {
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
    const offsets = [0];
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
function escapePdfText(value) {
    return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}
