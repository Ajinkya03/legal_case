"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Location = exports.Court = exports.Lookup = void 0;
const mongoose_1 = require("mongoose");
const lookupSchema = new mongoose_1.Schema({ name: { type: String, required: true, trim: true }, type: String, location: String, district: String, state: String }, { timestamps: true });
exports.Lookup = (0, mongoose_1.model)('Lookup', lookupSchema);
exports.Court = (0, mongoose_1.model)('Court', lookupSchema, 'courts');
exports.Location = (0, mongoose_1.model)('Location', lookupSchema, 'locations');
