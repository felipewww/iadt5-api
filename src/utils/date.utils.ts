import * as dayjs from 'dayjs';
import * as weekOfYear from 'dayjs/plugin/weekOfYear';
import * as utc from 'dayjs/plugin/utc';
dayjs.extend(weekOfYear);
dayjs.extend(utc);

export const DateUtils = {
    now: () => dayjs().toDate(),

    dateFromNow: (addDays: number) => {
        return dayjs().add(addDays, 'days').toDate();
    },

    /**
     * Retorna um novo Date representando somente ano/mês/dia,
     * com horário zerado (00:00). Útil para comparações ignorando o horário.
     */
    startOfDay(d: Date | string): Date {
        return dayjs(d).add(4, 'hours').startOf('day').toDate();
    },

    addDays(d: Date, days: number) {
        const r = new Date(d);
        r.setDate(r.getDate() + days);

        return r;
    },

    addMonths(d: Date, months: number): Date {
        const r = new Date(d);
        r.setMonth(r.getMonth() + months);
        return r;
    },

    isLater(a: Date, b: Date): Date {
        return a <= b ? a : b;
    },

    isEarlier(a: Date, b: Date): Date {
        return a >= b ? a : b;
    },
};
