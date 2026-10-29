"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("../modules/auth/auth.routes"));
const case_routes_1 = __importDefault(require("../modules/cases/case.routes"));
const operations_1 = __importDefault(require("./operations"));
const router = (0, express_1.Router)();
router.use('/auth', auth_routes_1.default);
router.use('/cases', case_routes_1.default);
router.use('/', operations_1.default);
exports.default = router;
