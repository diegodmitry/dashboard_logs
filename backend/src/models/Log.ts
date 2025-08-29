import mongoose, { Schema, Document } from 'mongoose';

export interface ILog extends Document {
  timestamp: Date;
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  source: string;
  errorCode?: string;
  context?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const LogSchema = new Schema<ILog>(
  {
    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
    level: {
      type: String,
      enum: ['error', 'warn', 'info', 'debug'],
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
    },
    source: {
      type: String,
      required: true,
    },
    errorCode: {
      type: String,
      index: true,
    },
    context: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// TTL de 10 dias (864000 segundos)
LogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 864000 });

// Índices compostos para consultas eficientes
LogSchema.index({ level: 1, timestamp: -1 });
LogSchema.index({ errorCode: 1, timestamp: -1 });

export const Log = mongoose.model<ILog>('Log', LogSchema);
