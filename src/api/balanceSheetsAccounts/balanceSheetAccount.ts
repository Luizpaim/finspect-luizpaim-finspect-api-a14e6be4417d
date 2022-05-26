import * as Mongoose from "mongoose";
import { IDocumentBase } from "../../interfaces/baseSchema";

export interface IBalanceSheetAccount extends IDocumentBase {
    code: string;
    level: number;
    name: string;
    description: string;
}

export const BalanceSheetAccountSchema = new Mongoose.Schema(
    {
        code: { type: String, unique: true, required: true},
        level: Number,
        name: { type: String, required: true},
        description: String,
        //BASE SCHEMA
        deleted: { type: Boolean, default: false, select: false },
        createdAt: { type: Date, select: false},
        updatedAt: { type: Date, select: false },
        __v: { type: Number, select: false }
    },
    {
        timestamps: true
    }
);

export const BalanceSheetAccountModel = Mongoose.model<IBalanceSheetAccount>("BalanceSheetAccount", BalanceSheetAccountSchema);