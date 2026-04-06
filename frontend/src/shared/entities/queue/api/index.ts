export class QueuesApi {
    private instance: QueuesApi | undefined

    getInstance() {
        if (!this.instance) {
            this.instance = new QueuesApi()
        }
        return this.instance
    }
}