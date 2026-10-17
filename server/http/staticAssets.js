import path from 'node:path';

/** Cache only content-addressed build assets indefinitely. */
export function staticAssetOptions(distDirectory) {
    return {
        maxAge: '1h',
        setHeaders(res, filePath) {
            const relativePath = path.relative(distDirectory, filePath).split(path.sep).join('/');
            if (filePath.endsWith('.html')) {
                res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            } else if (/^assets\/.+-[A-Za-z0-9_-]{8}\.(?:js|css)$/.test(relativePath)) {
                res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            }
        },
    };
}
