export const handleCreateRes = <T>(result: T) => (Array.isArray(result) ? result[0] : result);
