export class BusinessError extends Error {
    public constructor(message: string) {
        super(message);
        this.name = 'BusinessError';
    }
}
