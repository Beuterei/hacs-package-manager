export class TypeBusinessError extends TypeError {
    public constructor(message: string) {
        super(message);
        this.name = 'BusinessError';
    }
}
