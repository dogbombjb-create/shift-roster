/**
 * Roster Generator Utility
 */

export const STAFF = [
    { id: 'u', name: 'U' },
    { id: 'i', name: 'I' },
    { id: 'k', name: 'K' },
    { id: 't', name: 'T' },
    { id: 'm', name: 'M' },
];

export const SHIFT_TYPES = ['A', 'B'];
export const CLOSED_DAY = 'Closed';
export const SHOP_CLOSED = 'ShopClosed';
export const PAID_LEAVE = 'PL';
export const OFF = '-';

/**
 * Helper: Get number of days in a month
 */
export const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
};

/**
 * Helper: Get Day of Week string (Mon, Tue, ...) for a specific date
 * month is 0-indexed (0=Jan, 11=Dec)
 */
export const getDayOfWeek = (year, month, day) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[new Date(year, month, day).getDay()];
};

/**
 * Validates if the schedule respects constraints for a specific date string (YYYY-MM-DD)
 */
export const validateRoster = (schedule, dateStr) => {
    const staffU = schedule[dateStr]?.['u'];
    const staffI = schedule[dateStr]?.['i'];
    const staffK = schedule[dateStr]?.['k'];
    const staffT = schedule[dateStr]?.['t'];

    // Check if U and I are both working A or both working B
    if (staffU && staffI && ['A', 'B'].includes(staffU) && staffU === staffI) {
        return { valid: false, message: "Warning: U & I have same shift" };
    }
    // Check if K and T are both working A or both working B
    if (staffK && staffT && ['A', 'B'].includes(staffK) && staffK === staffT) {
        return { valid: false, message: "Warning: K & T have same shift" };
    }
    return { valid: true };
};

/**
 * Helper to check if a date is a holiday
 */
export const isHoliday = (dateStr, holidays) => {
    return holidays && holidays.has(dateStr);
};

/**
 * Generates a monthly schedule
 * @param {number} year 
 * @param {number} month (0-11)
 * @param {Object} currentSchedule - Existing manual overrides { "YYYY-MM-DD": { "u": "PL" } }
 * @param {Set<string>} holidays - Set of holiday date strings (YYYY-MM-DD)
 * @param {Set<string>} closedDays - Set of closed date strings (YYYY-MM-DD)
 */
export const generateMonthlyRoster = (year, month, currentSchedule = {}, holidays = new Set(), closedDays = new Set()) => {
    const newSchedule = { ...currentSchedule };
    const daysInMonth = getDaysInMonth(year, month);

    let uCounts = { A: 0, B: 0 };
    let kCounts = { A: 0, B: 0 };

    Object.keys(newSchedule).forEach(date => {
        const dayData = newSchedule[date];
        if (!dayData) return;
        if (dayData['u'] === 'A') uCounts.A++;
        if (dayData['u'] === 'B') uCounts.B++;
        if (dayData['k'] === 'A') kCounts.A++;
        if (dayData['k'] === 'B') kCounts.B++;
    });

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayOfWeek = getDayOfWeek(year, month, d);
        const isClosed = closedDays && closedDays.has(dateStr);
        const isRegularClosed = dayOfWeek === 'Mon' || dayOfWeek === 'Tue';

        // Initialize day
        if (!newSchedule[dateStr]) newSchedule[dateStr] = {};

        // Pre-check: If it's OPEN, clear system 'ShopClosed' but keep manual 'Cls'.
        if (!isClosed && !isRegularClosed) {
            STAFF.forEach(s => {
                if (newSchedule[dateStr][s.id] === SHOP_CLOSED) {
                    delete newSchedule[dateStr][s.id];
                }
            });
        }

        // 1. Handle Closed Days (Mon, Tue OR Manual Closed)
        if (isRegularClosed || isClosed) {
            STAFF.forEach(s => {
                // Preserve manual 'Cls' if it exists. DO NOT overwrite with ShopClosed.
                if (newSchedule[dateStr][s.id] !== CLOSED_DAY) {
                    newSchedule[dateStr][s.id] = SHOP_CLOSED;
                }
            });
            continue;
        }

        // 2. Identify Available Staff (exclude PL and manual Cls)
        const availableStaff = STAFF.filter(s => {
            const current = newSchedule[dateStr][s.id];
            if (current === PAID_LEAVE || current === CLOSED_DAY) return false;
            return true;
        });

        // 3. Assign M (Special Logic)
        const mAvailable = availableStaff.find(s => s.id === 'm');
        if (mAvailable) {
            let mShift = 'B';
            const isHoli = isHoliday(dateStr, holidays);
            if (['Wed', 'Thu', 'Fri'].includes(dayOfWeek) && !isHoli) {
                mShift = 'S';
            }
            newSchedule[dateStr]['m'] = mShift;
        }

        // 4. Assign Pairs (U/I and K/T)

        // U/I Pair
        const uAvailable = availableStaff.find(s => s.id === 'u');
        const iAvailable = availableStaff.find(s => s.id === 'i');

        // K/T Pair
        const kAvailable = availableStaff.find(s => s.id === 'k');
        const tAvailable = availableStaff.find(s => s.id === 't');

        let shiftCounts = { A: 0, B: 0 };

        // Count M's shift
        if (newSchedule[dateStr]['m'] === 'A') shiftCounts.A++;
        if (newSchedule[dateStr]['m'] === 'B') shiftCounts.B++;

        // Helper to assign pair
        const assignPair = (staff1, staff2, counts, setCounts) => {
            let s1Shift, s2Shift;
            if (counts.A > counts.B) { s1Shift = 'B'; s2Shift = 'A'; }
            else if (counts.B > counts.A) { s1Shift = 'A'; s2Shift = 'B'; }
            else {
                if (Math.random() > 0.5) { s1Shift = 'A'; s2Shift = 'B'; }
                else { s1Shift = 'B'; s2Shift = 'A'; }
            }
            newSchedule[dateStr][staff1.id] = s1Shift;
            newSchedule[dateStr][staff2.id] = s2Shift;

            setCounts[s1Shift]++;
            shiftCounts[s1Shift]++;
            shiftCounts[s2Shift]++;
        };

        if (uAvailable && iAvailable && !newSchedule[dateStr]['u'] && !newSchedule[dateStr]['i']) {
            assignPair(uAvailable, iAvailable, uCounts, uCounts);
        }

        if (kAvailable && tAvailable && !newSchedule[dateStr]['k'] && !newSchedule[dateStr]['t']) {
            assignPair(kAvailable, tAvailable, kCounts, kCounts);
        }

        // 5. Assign Remaining
        const pendingStaff = availableStaff.filter(s => !newSchedule[dateStr][s.id]);
        const shuffled = pendingStaff.sort(() => 0.5 - Math.random());

        shuffled.forEach(s => {
            if (shiftCounts.A <= shiftCounts.B) {
                newSchedule[dateStr][s.id] = 'A';
                shiftCounts.A++;
            } else {
                newSchedule[dateStr][s.id] = 'B';
                shiftCounts.B++;
            }
        });
    }

    return newSchedule;
};
