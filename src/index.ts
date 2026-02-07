import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import axios from 'axios';
import path from 'path';

// --- CONFIGURATION ---
const app = express();
const PORT = process.env.PORT || 3000;

// --- MIDDLEWARE ---
app.use(cors()); // Allow cross-origin requests
app.use(helmet({
    contentSecurityPolicy: false, // Disabled to allow iframe loading of external sites
}));
app.use(morgan('tiny')); // Logger
app.use(express.static(path.join(__dirname, '../public'))); // Serve UI

// --- TYPES ---
interface ProxyRequest {
    url: string;
    mode?: 'mobilebasic' | 'preview' | 'export';
    format?: string;
}

// --- UTILS ---
const extractDocId = (url: string): string | null => {
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
};

// --- ROUTES ---

// 1. SYSTEM STATUS
app.get('/api/status', (req, res) => {
    res.json({ status: 'ONLINE', system: 'NEXUS_OPS_V3', time: new Date().toISOString() });
});

// 2. METADATA FETCH (Scrapes title without downloading)
app.get('/api/meta', async (req: Request, res: Response) => {
    const { url } = req.query;
    if (!url || typeof url !== 'string') return res.status(400).json({ error: 'Missing URL' });

    const docId = extractDocId(url);
    if (!docId) return res.status(400).json({ error: 'Invalid Google Doc URL' });

    try {
        // We fetch the basic page to scrape the title
        const target = `https://docs.google.com/document/d/${docId}/mobilebasic`;
        const response = await axios.get(target, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }
        });

        const titleMatch = response.data.match(/<title>(.*?)<\/title>/);
        const title = titleMatch ? titleMatch[1].replace(' - Google Docs', '') : 'Unknown Document';

        res.json({ docId, title, size_est: response.headers['content-length'] || 'Unknown' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve metadata' });
    }
});

// 3. PROXY VIEWER (Bypasses CORS for the iFrame)
app.get('/api/proxy', async (req: Request, res: Response) => {
    const { url, mode } = req.query;
    if (!url || typeof url !== 'string') return res.status(400).send('URL Required');

    const docId = extractDocId(url);
    if (!docId) return res.status(400).send('Invalid ID');

    // Default to mobilebasic for cleanest extraction
    const viewMode = mode === 'preview' ? 'preview' : 'mobilebasic';
    const targetUrl = `https://docs.google.com/document/d/${docId}/${viewMode}`;

    try {
        const response = await axios.get(targetUrl, {
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        // Forward headers
        res.setHeader('Content-Type', response.headers['content-type']);
        
        // Pipe the stream directly to client
        response.data.pipe(res);
    } catch (error) {
        res.status(502).send('Proxy Error: Could not reach Google Servers');
    }
});

// 4. DOWNLOAD TUNNEL (Handles file exports)
app.get('/api/download', async (req: Request, res: Response) => {
    const { url, format } = req.query;
    const docId = extractDocId(url as string);
    if (!docId) return res.status(400).json({ error: 'Invalid ID' });

    const exportFormat = format || 'pdf';
    const downloadUrl = `https://docs.google.com/document/d/${docId}/export?format=${exportFormat}`;

    try {
        const response = await axios({
            method: 'GET',
            url: downloadUrl,
            responseType: 'stream'
        });

        res.setHeader('Content-Disposition', `attachment; filename="nexus_export_${docId}.${exportFormat}"`);
        res.setHeader('Content-Type', response.headers['content-type']);
        
        response.data.pipe(res);
    } catch (error) {
        res.status(500).send('Download Stream Failed');
    }
});

// --- INITIALIZATION ---
app.listen(PORT, () => {
    console.log(`[NEXUS] SYSTEM ONLINE ON PORT ${PORT}`);
});

export default app;
