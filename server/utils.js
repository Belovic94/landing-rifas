export function createExpirationDate(minutes) {
    const now = new Date();
    const expirationDate = new Date(now.getTime() + (minutes * 60 * 1000));
    
    return expirationDate.toISOString();
  }