// Restaurant business logic for reservations
export const checkTableAvailability = (
  tables: any[],
  partySize: number,
  dateTime: Date
): any[] => {
  return tables.filter(t => {
    if (t.capacity < partySize) return false;
    
    if (t.reservedAt && isTimeConflict(t.reservedAt, t.seatingDuration, dateTime)) {
      return false;
    }
    
    return true;
  });
};

export const calculateWaitlistPosition = (partySize: number, dateTime: Date) => {
  return { position: 5, estimatedWaitTime: 45 };
};

export const autoSeatFromWaitlist = (table: any, waitlist: any[]) => {
  return waitlist.find(entry => entry.partySize <= table.capacity) || null;
};

export const calculateSeatingDuration = (partySize: number) => {
  return 60 + (partySize > 4 ? (partySize - 4) * 10 : 0);
};

const isTimeConflict = (reservedAt: Date, duration: number, newTime: Date) => {
  const reservedEnd = new Date(reservedAt.getTime() + duration * 60000);
  const newEnd = new Date(newTime.getTime() + duration * 60000);
  
  return (
    (newTime >= reservedAt && newTime < reservedEnd) ||
    (newEnd > reservedAt && newEnd <= reservedEnd) ||
    (newTime <= reservedAt && newEnd >= reservedEnd)
  );
};
