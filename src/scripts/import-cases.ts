import * as XLSX from 'xlsx';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { env } from '../config/env';
import { Role } from '../modules/roles/role.model';
import { User } from '../modules/users/user.model';
import { Court, Location } from '../modules/lookups/lookup.model';
import { Case } from '../modules/cases/case.model';

const normalizeText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim();
};

const parseExcelDate = (value: unknown): Date | undefined => {
  if (!value) return undefined;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === 'number') {
    try {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (parsed) {
        return new Date(parsed.y, parsed.m - 1, parsed.d, parsed.H || 0, parsed.M || 0, parsed.S || 0);
      }
    } catch {
      // ignore and fall through
    }
  }

  const text = normalizeText(value);
  if (!text) return undefined;

  const normalized = text.replace(/\./g, '/');
  const parts = normalized.split(/[\/\-]/).map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 3) {
    const day = Number(parts[0]);
    const month = Number(parts[1]);
    const year = Number(parts[2]);
    if (!Number.isNaN(day) && !Number.isNaN(month) && !Number.isNaN(year)) {
      const date = new Date(year, month - 1, day);
      if (!Number.isNaN(date.getTime())) return date;
    }
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const normalizeCaseType = (value: unknown): string => {
  const text = normalizeText(value).toLowerCase();
  const map: Record<string, string> = {
    civil: 'Civil',
    criminal: 'Criminal',
    revenue: 'Revenue',
    family: 'Family',
    others: 'Others',
    other: 'Others',
    suit: 'Civil',
    appeal: 'Civil',
    'regular civil appeal': 'Civil',
    'special civil suit': 'Civil'
  };

  if (!text) return 'Others';
  const mapped = map[text];
  return mapped ?? (normalizeText(value).replace(/\s+/g, ' ').trim() || 'Others');
};

const normalizeCurrentStatus = (value: unknown): string => {
  const text = normalizeText(value).toLowerCase();
  if (!text) return 'Active';
  if (/closed|disposed|dismissed|decided|judgment|judgement|final/i.test(text)) return 'Closed';
  if (/stay|stayed/i.test(text)) return 'Stayed';
  return 'Active';
};

const normalizePriority = (value: unknown): 'High' | 'Medium' | 'Low' => {
  const text = normalizeText(value).toLowerCase();
  if (!text || text === 'none') return 'Medium';
  if (text.includes('high')) return 'High';
  if (text.includes('low')) return 'Low';
  return 'Medium';
};

const normalizeBoolean = (value: unknown): boolean => {
  const text = normalizeText(value).toLowerCase();
  return ['yes', 'y', 'true', '1'].includes(text);
};

const normalizeCaseTitle = (value: unknown, plaintiff: string, defendant: string): string => {
  const title = normalizeText(value);
  if (title) return title;
  if (plaintiff && defendant) return `${plaintiff} vs ${defendant}`;
  if (plaintiff) return plaintiff;
  return 'Untitled Case';
};

const toArray = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => normalizeText(item)).filter(Boolean);
  const text = normalizeText(value);
  return text ? text.split(',').map((item) => item.trim()).filter(Boolean) : [];
};

async function ensureDefaultUser() {
  const adminUserName = env.SEED_SUPER_ADMIN_USERNAME ?? 'superadmin';
  const adminEmail = env.SEED_SUPER_ADMIN_EMAIL ?? 'superadmin@example.com';

  let user = await User.findOne({ username: adminUserName });
  if (!user) {
    let role = await Role.findOne({ name: 'Super Admin' });
    if (!role) {
      role = await Role.create({
        name: 'Super Admin',
        permissions: ['case:create', 'case:read:all', 'case:update', 'case:delete', 'hearing:create', 'document:create', 'calendar:manage', 'settings:read', 'settings:manage', 'user:manage', 'report:export'],
        isSystemRole: true
      });
    }

    const passwordHash = await bcrypt.hash(env.SEED_SUPER_ADMIN_PASSWORD, 12);
    user = await User.create({
      name: 'System Administrator',
      email: adminEmail,
      username: adminUserName,
      passwordHash,
      role: role._id,
      status: 'active'
    });
  }

  return user._id;
}

async function findOrCreateCourt(name: string) {
  const courtName = normalizeText(name) || 'Unknown Court';
  let court = await Court.findOne({ name: courtName });
  if (!court) {
    court = await Court.create({ name: courtName, type: 'Court' });
  }
  return court._id;
}

async function findOrCreateLocation(place: string, village: string) {
  const locationName = normalizeText(village) || normalizeText(place) || 'Unknown Location';
  let location = await Location.findOne({ name: locationName });
  if (!location) {
    location = await Location.create({
      name: locationName,
      district: normalizeText(place) || 'Unknown',
      state: 'Maharashtra'
    });
  }
  return location._id;
}

function findHeaderRow(rows: unknown[][]) {
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index] ?? [];
    const joined = row
      .map((cell) => normalizeText(cell))
      .join(' | ')
      .toLowerCase();
    if (joined.includes('sr. no.') || joined.includes('case no.') || joined.includes('court name')) {
      return { index, headers: row.map((cell) => normalizeText(cell)) };
    }
  }

  throw new Error('Could not locate the header row in the Excel sheet.');
}

async function importCasesFromWorkbook(filePath: string) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error(`No worksheet found in workbook: ${filePath}`);
  }
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Worksheet not found: ${sheetName}`);
  }
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, blankrows: false }) as unknown[][];

  const { index: headerIndex, headers } = findHeaderRow(rows);
  const dataRows = rows
    .slice(headerIndex + 1)
    .filter((row): row is unknown[] => Array.isArray(row) && row.some((cell) => normalizeText(cell) !== ''));

  const assignedPersonId = await ensureDefaultUser();
  let imported = 0;

  for (const row of dataRows) {
    const record: Record<string, unknown> = {};
    headers.forEach((header, idx) => {
      record[header] = row[idx] ?? '';
    });

    const normalizedRecord = Object.fromEntries(
      Object.entries(record).map(([key, value]) => [normalizeText(key).toLowerCase(), value])
    );

    if (!normalizedRecord['case no.'] && !normalizedRecord['party name *'] && !normalizedRecord['second party name *']) {
      continue;
    }

    const caseNumber = normalizeText(normalizedRecord['case no.']);
    const plaintiff = normalizeText(normalizedRecord['party name *']);
    const defendant = normalizeText(normalizedRecord['second party name *']);
    const courtName = normalizeText(normalizedRecord['court name *']);
    const place = normalizeText(normalizedRecord['place']);
    const village = normalizeText(normalizedRecord['village']);
    const filingDateValue = normalizedRecord['filling date *'] ?? normalizedRecord['filing date *'];
    const filingDate = parseExcelDate(filingDateValue) ?? new Date();
    const nextHearingDate = parseExcelDate(normalizedRecord['next date *']);
    const registrationDate = parseExcelDate(normalizedRecord['registration date']);
    const yearValue = Number(normalizeText(normalizedRecord['year']) || new Date(filingDate).getFullYear());
    const caseType = normalizeCaseType(normalizedRecord['case type *']);
    const currentStatus = normalizeCurrentStatus(normalizedRecord['current status *']);
    const priority = normalizePriority(normalizedRecord['priority (low, medium, high) *']);
    const practiceArea = normalizeText(normalizedRecord['practice area *']);
    const caseStage = normalizeText(normalizedRecord['stage *']) || normalizeText(normalizedRecord['stage']);
    const claimValue = normalizeText(normalizedRecord['claim of the suit']);
    const remarks = normalizeText(normalizedRecord['remark']);
    const tags = [...new Set([...toArray(normalizedRecord['tags']), practiceArea, courtName, village].filter(Boolean))];
    const cmdDecisionRequired = normalizeBoolean(normalizedRecord['cmd decision (yes or no) *']);

    const courtId = await findOrCreateCourt(courtName || 'Unknown Court');
    const locationId = await findOrCreateLocation(place, village);
    const title = normalizeCaseTitle(claimValue || normalizedRecord['title'], plaintiff, defendant);
    const safeCaseNumber = caseNumber || `LC-${new Date(filingDate).getFullYear()}-${String(imported + 1).padStart(4, '0')}`;

    const upsertPayload = {
      caseId: safeCaseNumber,
      caseNumber: safeCaseNumber,
      caseTitle: title,
      caseType,
      plaintiff: plaintiff || 'Unknown Plaintiff',
      defendant: defendant || 'Unknown Defendant',
      caseStage,
      practiceArea: practiceArea || 'General',
      court: courtId,
      villageLocation: locationId,
      filingDate,
      registrationDate,
      currentStatus,
      nextHearingDate,
      priority,
      cmdDecisionRequired,
      remarks: remarks || undefined,
      year: Number.isFinite(yearValue) ? yearValue : new Date(filingDate).getFullYear(),
      tags,
      keywords: tags,
      assignedPerson: assignedPersonId,
      createdBy: assignedPersonId,
      isDeleted: false
    };

    const existing = await Case.findOne({ caseNumber: safeCaseNumber }).lean();
    if (existing) {
      await Case.updateOne({ _id: existing._id }, { $set: upsertPayload });
    } else {
      await Case.create(upsertPayload);
    }

    imported += 1;
  }

  return imported;
}

async function main() {
  const fileArg = process.argv[2] || path.resolve(process.cwd(), 'cases_list_2026.xlsx');
  await connectDatabase();
  try {
    const imported = await importCasesFromWorkbook(fileArg);
    console.log(`Imported ${imported} case rows from ${fileArg}`);
  } finally {
    await disconnectDatabase();
  }
}

main().catch((error) => {
  console.error('Excel import failed:', error);
  process.exit(1);
});
