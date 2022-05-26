import * as Mongoose from "mongoose";
import { IDocumentBase } from "../../interfaces/baseSchema";

export interface IPlan extends IDocumentBase {
    pagarmeId: number;
    name: string;
    value: number;
    maxCompanies: number;
    days: number;
    items: string[];
    free: boolean;
    negotiated: boolean;
}

export const PlanSchema = new Mongoose.Schema(
    {
        pagarmeId: Number,
        name: String,
        value: { type: Number, default: 0 },
        maxCompanies: { type: Number, default: 0 },
        days: { type: Number, enum: [30, 365] },
        items: { type: Array, required: true },
        free: { type: Boolean, default: false },
        negotiated: { type: Boolean, default: false },
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

export const PlanModel = Mongoose.model<IPlan>('Plan', PlanSchema);
