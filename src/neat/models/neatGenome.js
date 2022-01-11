class Genome {
    constructor(nodes = [], connections = []) {
        this.species = null
        this.nodes = nodes
        this.nodeMap = {}
        this.layers = []
        this.connections = connections
        this.connectionMap = {}
        this.g = null
        if (connections.length > 0) this.buildGenomeMap()
        this.constructLayers()
    }

    buildGenomeMap() {
        this.connectionMap = {}
        for (let i = 0; i < this.connections.length; i++) {
            const current = this.connections[i]
            this.connectionMap[current.id] = i
        }
        this.nodeMap = {}
        for (let i = 0; i < this.nodes.length; i++) {
            const current = this.nodes[i]
            this.nodeMap[current.id] = i
        }
    }

    static FromJson(json) {
        const data = JSON.parse(json)
        const nodes = data.nodes.map(n => Node.FromJson(n))
        const connections = data.connections.map(c => Connection.FromJson(c))
        return new Genome(nodes, connections)
    }

    copy() {
        return new Genome(this.nodes.map(n => n.copy()), this.connections.map(c => c.copy()))
    }

    toJson() {
        const nodesJson = this.nodes.map(n => n.toJson())
        const connectionsJson = this.connections.map(c => c.toJson())
        return JSON.stringify({ nodes: nodesJson, connections: connectionsJson })
    }

    getNode(nodeId) {
        if (this.nodeMap[nodeId]) return this.nodes[this.nodeMap[nodeId]]
        return undefined
    }

    getGraph() {
        if (this.g == null) {
            const graph = {}
            for (let i = 0; i < this.nodes.length; i++) {
                let node = this.nodes[i]
                graph[node.id] = { children: [], parents: [], value: 0, node }
            }
            for (let i = 0; i < this.connections.length; i++) {
                const con = this.connections[i]
                graph[con.inNode].children.push(con)
                graph[con.outNode].parents.push(con)
            }
            this.g = graph
        }
        return this.g
    }

    getLongestPathToInput(nodeId, graph, visited = {}) {
        visited[nodeId] = true
        if (graph[nodeId].node.type == NodeType.input) return 0
        const parents = graph[nodeId].parents
        if (parents.length == 0) return undefined
        const lengths = []
        for (let i = 0; i < parents.length; i++) {
            if (visited[parents[i].inNode] || parents[i].isRecurrent()) continue
            lengths.push(this.getLongestPathToInput(parents[i].inNode, graph, visited) + 1)
        }
        return Math.max(...lengths)
    }

    constructLayers() {
        this.layers = []
        const layerMap = {}
        const graph = this.getGraph()
        const inputNodes = []
        const outputNodes = []
        for (let i = 0; i < this.nodes.length; i++) {
            if (this.nodes[i].type == NodeType.input) {
                inputNodes.push(this.nodes[i])
                continue
            }
            if (this.nodes[i].type == NodeType.output) {
                outputNodes.push(this.nodes[i])
                continue
            }
            const l = this.getLongestPathToInput(this.nodes[i].id, graph)
            if (layerMap[l] == undefined) layerMap[l] = []
            this.nodes[i].layer = l
            layerMap[l].push(this.nodes[i])
        }
        const maxLayer = Object.keys(layerMap).length + 1
        for (let i = 0; i < outputNodes.length; i++) {
            outputNodes[i].layer = maxLayer
        }
        this.layers = [inputNodes, ...Object.values(layerMap), outputNodes]
        for (let i = 0; i < this.layers.length; i++) {
            this.layers[i].sort((a, b) => a.id - b.id)
        }
    }

    simplify(neat) {
        // this.augment(neat)
        // return
        if (Math.random() < neat.probs.biasMutationChance) {
            if (Math.random() < neat.probs.biasShiftChance) this.mutateBiasShift(neat.hyper.biasShiftStrength)
            else this.mutateBiasRandom(neat)
        }
        if (this.connections.length < 1) return
        if (Math.random() < neat.probs.weightMutationChance) {
            if (Math.random() < neat.probs.weightShiftChance) this.mutateWeightShift(neat.hyper.weightShiftStrength)
            else this.mutateWeightRandom(neat)
        }
        if (Math.random() < neat.probs.disableConnectionChance) this.mutateDeleteConnection()
        if (Math.random() < neat.probs.addNodeChance) this.mutateDeleteNode(neat)
    }

    mutateDeleteConnection() {
        const graph = this.getGraph()
        const con = getRandomElement(this.connections)
        if (graph[con.outNode].node.type == NodeType.hidden) {
            if (graph[con.outNode].parents.length == 1) {
                const nodeIndex = this.nodeMap[con.outNode]
                for (let i = 0; i < graph[con.outNode].children.length; i++) {
                    for (let j = 0; j < this.connections.length; j++) {
                        if (this.connections[j].id == graph[con.outNode].children[i].id) {
                            this.connections.splice(j, 1)
                            break
                        }
                    }
                }
                this.nodes.splice(nodeIndex, 1)
                delete this.nodeMap[con.outNode]
            }
        }
        if (graph[con.inNode].node.type == NodeType.hidden) {
            if (graph[con.inNode].children.length == 1) {
                const nodeIndex = this.nodeMap[con.inNode]
                for (let i = 0; i < graph[con.inNode].parents.length; i++) {
                    for (let j = 0; j < this.connections.length; j++) {
                        if (this.connections[j].id == graph[con.inNode].parents[i].id) {
                            this.connections.splice(j, 1)
                            break
                        }
                    }
                }
                this.nodes.splice(nodeIndex, 1)
                delete this.nodeMap[con.inNode]
            }
        }

        for (let j = 0; j < this.connections.length; j++) {
            if (this.connections[j].id == con.id) {
                this.connections.splice(j, 1)
                break
            }
        }
        this.buildGenomeMap()
        this.constructLayers()
    }

    mutateDeleteNode(neat) {
        const graph = this.getGraph()
        const hiddenNodes = this.nodes.filter(n => n.type == NodeType.hidden)
        if (hiddenNodes.length < 1) return
        for (let i = 0; i < 20; i++) {
            const n = getRandomElement(hiddenNodes)
            if (graph[n.id].parents.length <= 1 || graph[n.id].parents.length <= 1) {
                if (graph[n.id].parents.length == 1) {
                    const newInNode = graph[graph[n.id].parents[0].inNode].node
                    for (let j = 0; j < graph[n.id].children.length; j++) {
                        const newOutNode = graph[graph[n.id].children[j].outNode].node
                        const newWeight = graph[n.id].parents[0].weight * graph[n.id].children[j].weight
                        neat.addConnection(this, newInNode, newOutNode, newWeight)
                    }
                } else if (graph[n.id].children.length == 1) {
                    const newOutNode = graph[graph[n.id].children[0].inNode].node
                    for (let j = 0; j < graph[n.id].parents.length; j++) {
                        const newInNode = graph[graph[n.id].parents[j].outNode].node
                        const newWeight = graph[n.id].parents[j].weight * graph[n.id].children[0].weight
                        neat.addConnection(this, newInNode, newOutNode, newWeight)
                    }
                }
                for (let j = 0; j < graph[n.id].parents.length; j++) {
                    const con = graph[n.id].parents[j]
                    const conIndex = this.connectionMap[con.id]
                    this.connections.splice(conIndex, 1)
                    delete this.connectionMap[con.id]
                    this.buildGenomeMap()
                }
                for (let j = 0; j < graph[n.id].children.length; j++) {
                    const con = graph[n.id].children[j]
                    const conIndex = this.connectionMap[con.id]
                    this.connections.splice(conIndex, 1)
                    delete this.connectionMap[con.id]
                    this.buildGenomeMap()
                }
                const nodeIndex = this.nodeMap[n.id]
                this.nodes.splice(nodeIndex, 1)
                delete this.nodeMap[n.id]
                this.buildGenomeMap()
                this.constructLayers()
                break
            }
        }
    }

    augment(neat) {
        if (Math.random() < neat.probs.biasMutationChance) {
            if (Math.random() < neat.probs.biasShiftChance) this.mutateBiasShift(neat.hyper.biasShiftStrength)
            else this.mutateBiasRandom(neat)
        }
        if (Math.random() < neat.probs.addConnectionChance) this.mutateConnection(neat)
        if (this.connections.length < 1) return
        if (Math.random() < neat.probs.weightMutationChance) {
            if (Math.random() < neat.probs.weightShiftChance) this.mutateWeightShift(neat.hyper.weightShiftStrength)
            else this.mutateWeightRandom(neat)
        }
        if (Math.random() < neat.probs.addNodeChance) this.mutateInterpose(neat)
        if (Math.random() < neat.probs.disableConnectionChance) this.mutateDisableConnection()
    }

    mutateBiasShift(x = 0.3) {
        const n = getRandomElement(this.nodes)
        n.bias *= randomStd0() * x
        this.g = null
    }

    mutateBiasRandom(neat) {
        const n = getRandomElement(this.nodes)
        n.bias = randomRange(neat.hyper.minBias, neat.hyper.maxBias)
        this.g = null
    }

    mutateConnection(neat) {
        for (let i = 0; i < 20; i++) {
            const a = getRandomElement(this.nodes)
            const b = getRandomElement(this.nodes)
            if (!neat.addConnection(this, a, b)) continue
            this.g = null
            break
        }
        this.constructLayers()
    }

    mutateInterpose(neat) {
        let outNode
        for (let i = 0; i < 20; i++) {
            const con = getRandomElement(this.connections)
            if (con.isRecurrent() || !con.enabled) continue
            outNode = this.nodes[this.nodeMap[con.outNode]]
            neat.interposeConnection(this, con)
            this.g = null
            break
        }
        this.constructLayers()
        for (let i = 0; i < this.connections.length; i++) {
            const con = this.connections[i]
            if (con.inNode.layer >= con.outNode.layer) con.enabled = false
        }
        this.constructLayers()
    }

    mutateWeightShift(x = 0.3) {
        const con = getRandomElement(this.connections)
        con.weight *= randomStd0() * x
        this.g = null
    }

    mutateWeightRandom(neat) {
        const con = getRandomElement(this.connections)
        con.weight = randomRange(neat.hyper.minWeight, neat.hyper.maxWeight)
        this.g = null
    }

    mutateDisableConnection() {
        const con = getRandomElement(this.connections)
        con.enabled = false
        this.g = null
        this.constructLayers()
    }
}