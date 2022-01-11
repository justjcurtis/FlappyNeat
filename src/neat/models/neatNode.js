class Node {
    constructor(id, type, bias) {
        this.id = id
        this.bias = bias
        this.type = type
        this.layer = type == NodeType.input ? 0 : null
    }

    static Equal(a, b) {
        return a.id == b.id
    }

    static FromJson(json) {
        const data = JSON.parse(json)
        return new Node(data.id, data.type, data.bias, data.layer)
    }

    copy() {
        const n = new Node(this.id, this.type, this.bias)
        n.layer = this.layer
        return n
    }

    toJson() {
        return JSON.stringify({ id: this.id, type: this.type, bias: this.bias, layer: this.layer })
    }
}