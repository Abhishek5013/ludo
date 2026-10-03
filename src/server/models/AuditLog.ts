import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  gameId: string;
  adminUsername: string;
  targetPlayerId: string;
  targetPlayerName: string;
  forcedValue: number | null;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  gameId: { type: String, required: true, index: true },
  adminUsername: { type: String, required: true },
  targetPlayerId: { type: String, required: true },
  targetPlayerName: { type: String, required: true },
  forcedValue: { type: Number, default: null },
  timestamp: { type: Date, default: Date.now },
});

export const AuditLog = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
