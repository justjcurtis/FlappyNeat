class Client {
    constructor(genome) {
        this.genome = genome
        this.score = -Infinity
    }

    feedForward(inputs, graph) {
        for (let i = 0; i < this.genome.layers[0].length; i++) {
            const node = this.genome.layers[0][i]
            let value = inputs[i]
            for (let p = 0; p < graph[node.id].parents.length; p++) {
                const parentCon = graph[node.id].parents[p]
                if (!parentCon.enabled) continue
                value += parentCon.outputCache
            }
            graph[node.id].value = value
        }
        for (let l = 1; l < this.genome.layers.length; l++) {
            const layer = this.genome.layers[l]
            for (let i = 0; i < layer.length; i++) {
                const node = layer[i]
                let value = 0
                for (let p = 0; p < graph[node.id].parents.length; p++) {
                    const parentCon = graph[node.id].parents[p]
                    if (!parentCon.enabled) continue
                    if (parentCon.isRecurrent()) value += parentCon.outputCache
                    else value += graph[parentCon.inNode].value * parentCon.weight
                }
                graph[node.id].value = aFn[node.activation](value + node.bias)
            }
        }
        const recurrentConnections = this.genome.connections.filter(con => con.isRecurrent())
        for (let i = 0; i < recurrentConnections.length; i++) {
            const con = recurrentConnections[i]
            con.outputCache = graph[con.inNode].value
        }
        return this.genome.layers[this.genome.layers.length - 1].map(n => graph[n.id].value)
    }

    predict(inputs) {
        if (inputs.length != this.genome.layers[0].length)
            throw (`Expected input size ${this.genome.layers[0].length} but received ${inputs.length}`)
        const graph = this.genome.getGraph()
        return this.feedForward(inputs, graph)
    }
}