"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const case_model_1 = require("../modules/cases/case.model");
const hearing_model_1 = require("../modules/hearings/hearing.model");
const user_model_1 = require("../modules/users/user.model");
async function importHearingsFromCases() {
    await (0, database_1.connectDatabase)();
    const responsiblePerson = await user_model_1.User.findOne({ username: 'admin', isDeleted: false });
    if (!responsiblePerson)
        throw new Error('Admin user not found.');
    const cases = await case_model_1.Case.find({
        isDeleted: false,
        nextHearingDate: { $exists: true, $ne: null }
    }).select('_id nextHearingDate').lean();
    let created = 0;
    for (const courtCase of cases) {
        const hearingDate = new Date(courtCase.nextHearingDate);
        const existing = await hearing_model_1.Hearing.findOne({
            caseId: courtCase._id,
            hearingDate,
            isDeleted: false
        });
        if (existing)
            continue;
        await hearing_model_1.Hearing.create({
            caseId: courtCase._id,
            hearingDate,
            nextHearingDate: hearingDate,
            responsiblePerson: responsiblePerson._id,
            status: 'Upcoming',
            isDeleted: false
        });
        created += 1;
    }
    console.log(`Created ${created} hearing records from ${cases.length} cases.`);
    await (0, database_1.disconnectDatabase)();
}
importHearingsFromCases().catch(async (error) => {
    console.error('Hearing import failed:', error);
    await (0, database_1.disconnectDatabase)();
    process.exitCode = 1;
});
