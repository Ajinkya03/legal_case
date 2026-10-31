import { connectDatabase, disconnectDatabase } from '../config/database';
import { Case } from '../modules/cases/case.model';
import { Hearing } from '../modules/hearings/hearing.model';
import { User } from '../modules/users/user.model';

async function importHearingsFromCases(): Promise<void> {
  await connectDatabase();
  const responsiblePerson = await User.findOne({ username: 'admin', isDeleted: false });
  if (!responsiblePerson) throw new Error('Admin user not found.');

  const cases = await Case.find({
    isDeleted: false,
    nextHearingDate: { $exists: true, $ne: null }
  }).select('_id nextHearingDate').lean();

  let created = 0;
  for (const courtCase of cases) {
    const hearingDate = new Date(courtCase.nextHearingDate as Date);
    const existing = await Hearing.findOne({
      caseId: courtCase._id,
      hearingDate,
      isDeleted: false
    });
    if (existing) continue;

    await Hearing.create({
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
  await disconnectDatabase();
}

importHearingsFromCases().catch(async (error: unknown) => {
  console.error('Hearing import failed:', error);
  await disconnectDatabase();
  process.exitCode = 1;
});
