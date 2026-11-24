import { Schema, models, model } from "mongoose";

export type ExpenseCategory =
  | "Electricity"
  | "Rent"
  | "Staff Salary"
  | "Ground Maintenance"
  | "Cricket Equipment"
  | "Internet"
  | "Marketing"
  | "Cleaning"
  | "Repairs"
  | "Other";

export interface IExpense {
  _id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  date: string; // YYYY-MM-DD
  description?: string;
  receiptImage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: [
        "Electricity",
        "Rent",
        "Staff Salary",
        "Ground Maintenance",
        "Cricket Equipment",
        "Internet",
        "Marketing",
        "Cleaning",
        "Repairs",
        "Other",
      ],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    date: { type: String, required: true },
    description: { type: String },
    receiptImage: { type: String },
  },
  { timestamps: true }
);

ExpenseSchema.index({ date: 1 });

export default models.Expense || model<IExpense>("Expense", ExpenseSchema);
