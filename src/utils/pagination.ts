import { FilterQuery, Model } from 'mongoose';

export async function paginate<T>(
  model: Model<T>,
  filter: FilterQuery<T>,
  query: Record<string, unknown>,
  populate?: string | string[]
) {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
  const sortBy = typeof query.sortBy === 'string' ? query.sortBy : 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
  const [data, total] = await Promise.all([
    model.find(filter).sort({ [sortBy]: sortOrder }).skip((page - 1) * limit).limit(limit).populate(populate ?? []),
    model.countDocuments(filter)
  ]);
  return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}