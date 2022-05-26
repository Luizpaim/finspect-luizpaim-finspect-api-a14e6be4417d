import * as Mongoose from "mongoose";
import { IDocumentBase } from "../../interfaces/baseSchema";

export interface ISituation extends IDocumentBase {
  name: string;
  message: string;
  frequency: string;
  formulas: object[];
  group: string;
  active: boolean;
  order: number;
}

export const SituationGroups = [
  'description1', 'description2', 'description3', 'description4', 'description5',
  'revenues', 'costs', 'expenses', 'profitability', 'liquidity', 'structure',
  'coberture', 'financial-need', 'cicle', 'cash-flow', 'return',
  'conclusion1', 'conclusion2', 'conclusion3', 'conclusion4', 'conclusion5'
];

export const SituationSchema = new Mongoose.Schema(
  {
    name: String,
    message: String,
    frequency: String,
    formulas: Array,
    active: { type: Boolean, default: true },
    group: String,
    order: { type: Number, default: 0 },
    //BASE SCHEMA
    deleted: { type: Boolean, default: false, select: false },
    createdAt: { type: Date, select: false },
    updatedAt: { type: Date, select: false },
    __v: { type: Number, select: false }
  },
  {
    timestamps: true
  }
);

export const SituationModel = Mongoose.model<ISituation>('Situation', SituationSchema);