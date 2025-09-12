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
    },
    level: {
      type: String,
      enum: ['error', 'warn', 'info', 'debug'],
      required: true,
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
    },
    context: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    // Desabilitar criação automática de índices pelo Mongoose
    // Os índices são criados pelo init.js do MongoDB
    autoIndex: false,
  }
);

// Índices são criados pelo init.js do MongoDB para evitar conflitos
// autoIndex: false previne criação automática de índices pelo Mongoose

export const Log = mongoose.model<ILog>('Log', LogSchema);
