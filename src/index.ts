import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import axios from 'axios';
import path from 'path';
import { Stream } from 'stream';

/**
 * NEXUS CORE ENGINE V3.1 - ADVANCED PROXY & EXTRACTION
 * Optimized for Render/Vercel Serverless Environments
 */

class NexusEngine {
    private app = express();
    private readonly PORT = process.env.PORT || 3000;
    private history: Array<{ id: string, title: string, timestamp: string }> = [];

    constructor() {
        this.initializeMiddleware();
        this.initializeRoutes();
        this.initializeErrorHandling();
    }

    private initializeMiddleware() {
        this.app.use(helmet({ contentSecurityPolicy: false })); // Allow iFrame bypass
        this.app.use(cors());
        this.app.use(morgan('combined')); // Detailed logging
        this.app.use(express.json());
        this.app.use(express.static(path.join(__dirname, '../public')));
    }

    private initializeRoutes() {
        // Heartbeat Protocol
        this.app.get('/api/v3/status', (req, res) => {
            res.status(200).json({
                status: 'OPERATIONAL',
                uptime: process.uptime(),
                memory: process.memoryUsage().heapUsed
            });
        });

        // Advanced Metadata Scraper
        this.app.get('/api/v3/meta', async (req: Request, res: Response, next: NextFunction) => {
            try {
                const { url } = req.query;
                const docId = this.extractId(url as string);
                
                const response = await axios.get(`https://docs.google.com/document/d/${docId}/mobilebasic`, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) NexusOps/3.1' }
                });

                const title = response.data.match(/<title>(.*?)<\/title>/)?.[1]?.replace(' - Google Docs', '') || 'RESTRICTED_ACCESS';
                
                const meta = { id: docId, title, timestamp: new Date().toISOString() };
                this.history.unshift(meta); // Push to volatile memory registry
                
                res.json(meta);
            } catch (error) {
                next(error);
            }
        });

        // Secure Stream Tunnel (The Proxy)
        this.app.get('/api/v3/proxy', async (req: Request, res: Response) => {
            const { url, mode } = req.query;
            const docId = this.extractId(url as string);
            const endpoint = mode === 'preview' ? 'preview' : 'mobilebasic';

            try {
                const streamResponse = await axios({
                    method: 'GET',
                    url: `https://docs.google.com/document/d/${docId}/${endpoint}`,
                    responseType: 'stream',
                    timeout: 15000
                });

                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                res.setHeader('X-Frame-Options', 'ALLOWALL');
                
                (streamResponse.data as Stream).pipe(res);
            } catch (error) {
                res.status(502).send('DATA_STREAM_INTERRUPTED');
            }
        });

        // Binary Export Tunnel
        this.app.get('/api/v3/export', async (req: Request, res: Response) => {
            const { url, format } = req.query;
            const docId = this.extractId(url as string);
            
            try {
                const download = await axios({
                    method: 'GET',
                    url: `https://docs.google.com/document/d/${docId}/export?format=${format}`,
                    responseType: 'stream'
                });

                res.setHeader('Content-Disposition', `attachment; filename="nexus_${docId}.${format}"`);
                (download.data as Stream).pipe(res);
            } catch (error) {
                res.status(500).json({ error: 'EXPORT_BUFFER_OVERFLOW' });
            }
        });

        // Registry Route
        this.app.get('/api/v3/registry', (req, res) => {
            res.json(this.history.slice(0, 10));
        });
    }

    private initializeErrorHandling() {
        this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
            console.error(`[CRITICAL_FAILURE]: ${err.message}`);
            res.status(500).json({
                error: 'INTERNAL_CORE_ERROR',
                code: 500,
                message: err.message
            });
        });
    }

    private extractId(url: string): string {
        return url.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1] || '';
    }

    public run() {
        this.app.listen(this.PORT, () => {
            console.log(`
            ███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗
            ████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝
            ██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗
            ██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║
            ██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║
            ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝
            CORE SYSTEM V3.1 ONLINE | PORT: ${this.PORT}
            `);
        });
    }
}

const nexus = new NexusEngine();
nexus.run();
