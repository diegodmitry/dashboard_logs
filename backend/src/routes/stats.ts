import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Log } from '../models/Log';
import logger from '../lib/logger';

const router = Router();

// Schema de validação para parâmetros de query
const StatsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).default('10'),
  bucket: z.enum(['hour', 'day']).default('hour'),
});

/**
 * GET /stats/top-errors
 * Retorna os top erros por período
 */
router.get('/top-errors', async (req: Request, res: Response) => {
  try {
    const { from, to, limit } = StatsQuerySchema.parse(req.query);
    
    const filter: any = { level: 'error' };
    
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }

    const topErrors = await Log.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$errorCode',
          count: { $sum: 1 },
          messages: { $push: '$message' },
          sources: { $addToSet: '$source' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },
      {
        $project: {
          errorCode: '$_id',
          count: 1,
          sampleMessages: { $slice: ['$messages', 5] },
          sources: 1,
          _id: 0,
        },
      },
    ]);

    logger.info({
      message: 'Top errors consultados',
      count: topErrors.length,
      filter,
    });

    res.json({
      success: true,
      data: topErrors,
      meta: {
        total: topErrors.length,
        period: { from, to },
      },
    });
  } catch (error) {
    logger.error({
      message: 'Erro ao buscar top errors',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    res.status(400).json({
      success: false,
      error: 'Parâmetros inválidos',
    });
  }
});

/**
 * GET /stats/time-series
 * Retorna série temporal de logs
 */
router.get('/time-series', async (req: Request, res: Response) => {
  try {
    const { from, to, bucket } = StatsQuerySchema.parse(req.query);
    
    const filter: any = {};
    
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }

    const timeFormat = bucket === 'hour' ? '%Y-%m-%d-%H' : '%Y-%m-%d';
    const groupId = bucket === 'hour' 
      ? { 
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' },
          hour: { $hour: '$timestamp' },
        }
      : {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' },
        };

    const timeSeries = await Log.aggregate([
      { $match: filter },
      {
        $group: {
          _id: groupId,
          total: { $sum: 1 },
          errors: {
            $sum: { $cond: [{ $eq: ['$level', 'error'] }, 1, 0] },
          },
          warnings: {
            $sum: { $cond: [{ $eq: ['$level', 'warn'] }, 1, 0] },
          },
          info: {
            $sum: { $cond: [{ $eq: ['$level', 'info'] }, 1, 0] },
          },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } },
    ]);

    // Formatar dados para resposta
    const formattedData = timeSeries.map(item => ({
      timestamp: new Date(
        item._id.year,
        item._id.month - 1,
        item._id.day,
        item._id.hour || 0
      ).toISOString(),
      total: item.total,
      errors: item.errors,
      warnings: item.warnings,
      info: item.info,
    }));

    logger.info({
      message: 'Time series consultada',
      count: formattedData.length,
      bucket,
      filter,
    });

    res.json({
      success: true,
      data: formattedData,
      meta: {
        bucket,
        period: { from, to },
      },
    });
  } catch (error) {
    logger.error({
      message: 'Erro ao buscar time series',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    res.status(400).json({
      success: false,
      error: 'Parâmetros inválidos',
    });
  }
});

/**
 * GET /stats/levels
 * Retorna distribuição por níveis de log
 */
router.get('/levels', async (req: Request, res: Response) => {
  try {
    const { from, to } = StatsQuerySchema.parse(req.query);
    
    const filter: any = {};
    
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }

    const levelsDistribution = await Log.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$level',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const total = levelsDistribution.reduce((sum, item) => sum + item.count, 0);
    
    const formattedData = levelsDistribution.map(item => ({
      level: item._id,
      count: item.count,
      percentage: total > 0 ? Math.round((item.count / total) * 100) : 0,
    }));

    logger.info({
      message: 'Distribuição por níveis consultada',
      total,
      levels: formattedData.length,
      filter,
    });

    res.json({
      success: true,
      data: formattedData,
      meta: {
        total,
        period: { from, to },
      },
    });
  } catch (error) {
    logger.error({
      message: 'Erro ao buscar distribuição por níveis',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    res.status(400).json({
      success: false,
      error: 'Parâmetros inválidos',
    });
  }
});

export default router;
