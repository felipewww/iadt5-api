import { HttpException } from '@nestjs/common';

const colored = process.stdout.isTTY === true;

const c = {
    reset:  colored ? '\x1b[0m'  : '',
    bold:   colored ? '\x1b[1m'  : '',
    red:    colored ? '\x1b[31m' : '',
    yellow: colored ? '\x1b[33m' : '',
    cyan:   colored ? '\x1b[36m' : '',
    white:  colored ? '\x1b[37m' : '',
    gray:   colored ? '\x1b[90m' : '',
};

const METHOD_COLOR: Record<string, string> = {
    GET:    c.cyan,
    POST:   c.yellow,
    PUT:    c.yellow,
    PATCH:  c.yellow,
    DELETE: c.red,
};

function statusColor(status: number): string {
    if (status >= 500) return c.red;
    if (status >= 400) return c.yellow;
    return c.white;
}

export function logHttpError(err: unknown, method: string, url: string, durationMs: number): void {
    const status = err instanceof HttpException ? err.getStatus() : 500;
    const message =
        err instanceof HttpException
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Internal Server Error';

    const sc  = statusColor(status);
    const mc  = METHOD_COLOR[method] ?? c.white;
    const dur = `${durationMs}ms`;

    const line = [
        `${c.bold}${sc}[${status}]${c.reset}`,
        `${mc}${method}${c.reset}`,
        `${c.white}${url}${c.reset}`,
        `${c.gray}${dur}${c.reset}`,
        `${sc}${message}${c.reset}`,
    ].join(' ');

    process.stderr.write(line + '\n');

    if (status >= 500 && err instanceof Error && err.stack) {
        const stack = err.stack
            .split('\n')
            .slice(1)
            .map((l) => `  ${c.gray}${l.trim()}${c.reset}`)
            .join('\n');
        process.stderr.write(stack + '\n');
    }
}
