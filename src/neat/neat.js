const defaultHyper = {
    c1: 1,
    c2: 1,
    c3: 0.4,
    weightShiftStrength: 0.2,
    biasShiftStrength: 0.2,
    threshold: 10,
    speciesTarget: 10,
    initialMutation: 1,
    cullRate: 0.8,
    minSpecies: 1,
    minWeight: -100,
    maxWeight: 100,
    minBias: -100,
    maxBias: 100,
    elitism: true,
    dropoff: 15,
    dropRate: 0.1,
    cloneRate: 0.25,
    complexityThreshold: 50,
    complexityFloorDelay: 10
}

const defaultProbs = {
    weightMutationChance: 0.8,
    weightShiftChance: 0.9,
    biasMutationChance: 0.8,
    biasShiftChance: 0.9,
    addConnectionChance: 0.02,
    addRecurrentChance: 0.02,
    reEnableConnectionChance: 0.25,
    disableConnectionChance: 0.02,
    addNodeChance: 0.02,
    deleteConnectionChance: 0.05,
    deleteNodeChance: 0.05,
    randomActivationChance: 0.05,
}

const defaultOpts = {
    maxPop: 100,
    recurrent: false,
    outputActivation: 'tanh',
    hiddenActivation: 'tanh',
    allowedActivations: [
        'id',
        'sig',
        'tanh',
        'relu',
        'bin',
        'gelu',
        'softPlus',
        'invert',
        'softSign',
        'bipolSig',
    ],
    hyper: {},
    probs: {}
}

class Neat {
    constructor(inputs, outputs, opts) {
        opts = {...defaultOpts, ...opts }
        this.inputs = inputs
        this.outputs = outputs
        this.outputActivation = opts.outputActivation
        this.hiddenActivation = opts.hiddenActivation
        this.allowedActivations = opts.allowedActivations
        this.maxPop = opts.maxPop
        this.pop = []
        this.connectionPool = {}
        this.connections = []
        this.replacePool = {}
        this.currentConnections = 0
        this.nodePool = []
        this.mandatoryNodes = []
        this.hyper = {...defaultHyper, ...opts.hyper }
        this.probs = {...defaultProbs, ...opts.probs }
        if (!opts.recurrent) this.probs.addRecurrentChance = 0
        this.prevSpecScores = {}
        this.dropoffTracker = {}
        this.nextPruneComplexity = 0
        this.pruning = false
        this.lastMCP = 0
        this.mcpFloorCount = 0
        this.lastPopFitness = 0
        this.currentPopFitness = 0
        this.fitnessPlatauCount = 0
        this.reset()
    }

    reset() {
        const outputNodes = []
        for (let i = 0; i < this.outputs; i++) {
            const node = new Node(i + this.inputs, NodeType.output, randomRange(this.hyper.minBias, this.hyper.maxBias))
            node.activation = aNm[this.outputActivation]
            outputNodes.push(node)
        }

        const inputNodes = []
        this.connections = []
        this.connectionPool = {}
        this.currentConnections = 0
        this.replacePool = {}
        this.prevSpecScores = {}
        this.dropoffTracker = {}

        for (let i = 0; i < this.inputs; i++) {
            const node = new Node(i, NodeType.input, randomRange(this.hyper.minBias, this.hyper.maxBias))
            inputNodes.push(node)
            for (let j = 0; j < outputNodes.length; j++) {
                this.connectionPool[`${node.id},${outputNodes[j].id}`] = this.currentConnections
                this.connections.push(new Connection(node.id, outputNodes[j].id, randomRange(this.hyper.minBias, this.hyper.maxBias), this.currentConnections))
                this.currentConnections++
            }
        }

        this.nodePool = [...inputNodes, ...outputNodes]
        this.mandatoryNodes = this.nodePool.slice(0)
        this.pop = []
        for (let i = 0; i < this.maxPop; i++) {
            const g = this.blankGenome()
            for (let j = 0; j < this.hyper.initialMutation; j++) {
                g.augment(this)
            }
            this.pop.push(new Client(g))
        }
        const currentMCP = this.mcp()
        this.nextPruneComplexity = currentMCP + this.hyper.complexityThreshold
        this.pruning = false
        this.lastMCP = 0
        this.mcpFloorCount = 0
        this.lastPopFitness = 0
        this.currentPopFitness = 0
        this.fitnessPlatauCount = 0
    }

    getInnovationId(inNodeId, outNodeId) {
        const id = `${inNodeId},${outNodeId}`
        if (this.connectionPool[id]) return this.connectionPool[id]
        this.connectionPool[id] = this.currentConnections
        this.currentConnections++;
        return this.currentConnections - 1
    }

    newNode(type) {
        const node = new Node(this.nodePool.length, type, randomRange(this.hyper.minBias, this.hyper.maxBias))
        for (let i = 0; i < this.nodePool.length; i++) {
            const current = this.nodePool[i]
            if (current.type < node.type) continue
            if (current.type == node.type) {
                if (current.id < node.id) continue
                this.nodePool.splice(i, 0, node)
                break
            }
            this.nodePool.splice(i, 0, node)
            break
        }
        return node
    }

    blankGenome() {
        const nodes = this.mandatoryNodes.slice(0)
        for (let i = 0; i < nodes.length; i++) {
            nodes[i] = nodes[i].copy()
            nodes[i].bias = randomRange(this.hyper.minBias, this.hyper.maxBias)
        }

        const connections = this.connections.slice(0)
        for (let i = 0; i < connections.length; i++) {
            connections[i].weight = randomRange(this.hyper.minWeight, this.hyper.maxWeight)
        }
        return new Genome(nodes, connections)
    }

    addConnection(genome, inNode, outNode, weight = undefined) {
        if (inNode.layer == outNode.layer) return false
        if (inNode.layer > outNode.layer && Math.random() >= this.probs.addRecurrentChance) return false

        const id = `${inNode.id},${outNode.id}`
        if (genome.connectionMap[id] != undefined) {
            if (Math.random() >= this.hyper.reEnableConnectionChance) return false
            genome.connections[genome.connectionMap[id]].enabled = true
            return true
        }
        const w = weight == undefined ? randomRange(this.hyper.minWeight, this.hyper.maxWeight) : weight
        const innov = this.getInnovationId(inNode.id, outNode.id)
        const connection = new Connection(inNode.id, outNode.id, w, innov)
        genome.connectionMap[connection.id] = genome.connections.length
        genome.connections.push(connection)
        return true
    }

    interposeConnection(genome, connection) {
        let node;
        if (this.replacePool[connection.id] != undefined) {
            node = this.replacePool[connection.id].copy()
        } else {
            node = this.newNode(NodeType.hidden)
            node.activation = aNm[this.hiddenActivation]
            this.replacePool[connection.id] = node
        }
        const innovA = this.getInnovationId(connection.inNode, node.id)
        const innovB = this.getInnovationId(node.id, connection.outNode)
        const connectionA = new Connection(connection.inNode, node.id, 1, innovA)
        const connectionB = new Connection(node.id, connection.outNode, connection.weight, innovB)

        const i = genome.connectionMap[connection.id]
        genome.connections[i].enabled = false

        genome.connectionMap[connectionA.id] = genome.connections.length
        genome.connections.push(connectionA)
        genome.connectionMap[connectionB.id] = genome.connections.length
        genome.connections.push(connectionB)
        genome.nodeMap[node.id] = genome.nodes.length
        node.layer = genome.nodes[genome.nodeMap[connection.inNode]] + 1
        genome.nodes.push(node)
    }

    mcp() {
        let total = 0
        for (let i = 0; i < this.pop.length; i++) {
            const c = this.pop[i]
            total += c.genome.nodes.length
            total += c.genome.connections.length
        }
        return total / this.pop.length
    }

    dist(g1, g2) {
        let i1 = 0
        let i2 = 0

        const h1 = g1.connections.length > 0 ? g1.connections.slice(-1)[0].innov : 0
        const h2 = g2.connections.length > 0 ? g2.connections.slice(-1)[0].innov : 0
        if (h1 < h2) {
            const temp = g1
            g1 = g2
            g2 = temp
        }

        let disjoint = 0
        let similar = 0
        let weightDiff = 0

        while (i1 < g1.connections.length && i2 < g2.connections.length) {
            const a = g1.connections[i1]
            const b = g2.connections[i2]
            if (a.innov == b.innov) {
                similar++
                weightDiff += Math.abs(a.weight - b.weight)
                i1++
                i2++
                continue
            } else if (a.innov > b.innov) {
                disjoint++
                i2++
            } else {
                disjoint++
                i1++
            }
        }

        if (similar > 0) weightDiff /= similar
        let excess = g1.connections.length - i1
        let N = Math.max(g1.connections.length, g2.connections.length)
        if (N < 20) N = 1

        return ((this.hyper.c1 * disjoint) / N) + ((this.hyper.c2 * excess) / N) + (this.hyper.c3 * weightDiff)
    }

    crossover(g1, g2) {
        let i1 = 0
        let i2 = 0

        const newConnections = []
        const nodeSet = {}
        for (let i = 0; i < this.mandatoryNodes.length; i++) {
            const curr = this.mandatoryNodes[i].copy()
            nodeSet[curr.id] = curr
        }

        while (i1 < g1.connections.length && i2 < g2.connections.length) {
            const a = g1.connections[i1]
            const b = g2.connections[i2]
            if (a.innov == b.innov) {
                if (Math.random() > 0.5) {
                    newConnections.push(a.copy())
                    nodeSet[a.inNode] = g1.nodes[g1.nodeMap[a.inNode]]
                    nodeSet[a.outNode] = g1.nodes[g1.nodeMap[a.outNode]]
                } else {
                    newConnections.push(b.copy())
                    nodeSet[b.inNode] = g2.nodes[g2.nodeMap[b.inNode]]
                    nodeSet[b.outNode] = g2.nodes[g2.nodeMap[b.outNode]]
                }
                i1++
                i2++
                continue
            } else if (a.innov < b.innov) {
                newConnections.push(a)
                nodeSet[a.inNode] = g1.nodes[g1.nodeMap[a.inNode]]
                nodeSet[a.outNode] = g1.nodes[g1.nodeMap[a.outNode]]
                i1++
            } else {
                i2++
            }
        }
        while (i1 < g1.connections.length) {
            const a = g1.connections[i1]
            newConnections.push(a.copy())
            nodeSet[a.inNode] = g1.nodes[g1.nodeMap[a.inNode]]
            nodeSet[a.outNode] = g1.nodes[g1.nodeMap[a.outNode]]
            i1++
        }
        const nodeVals = Object.values(nodeSet)
        const newNodes = nodeVals.map(n => n.copy())
        return new Genome(newNodes, newConnections)
    }

    speciate() {
        let species = {}
        let maxCurrentSpecies = 0
        for (let i = 0; i < this.pop.length; i++) {
            const current = this.pop[i]
            if (current.genome.species == null) continue
            if (species[current.genome.species] != undefined) continue
            if (maxCurrentSpecies < current.genome.species) maxCurrentSpecies = current.genome.species
            species[current.genome.species] = [current]
        }
        popLoop:
            for (let i = 0; i < this.pop.length; i++) {
                const currentKnownSpecs = Object.keys(species)
                for (let j = 0; j < currentKnownSpecs.length; j++) {
                    const spec = currentKnownSpecs[j]
                    if (this.pop[i].genome == species[spec][0].genome) continue
                    const d = this.dist(this.pop[i].genome, species[spec][0].genome)
                    if (d > this.hyper.threshold) continue
                    this.pop[i].genome.species = spec
                    species[spec].push(this.pop[i])
                    continue popLoop
                }
                maxCurrentSpecies++
                this.pop[i].genome.species = maxCurrentSpecies
                species[maxCurrentSpecies] = [this.pop[i]]
            }

        species = Object.values(species)
        for (let i = 0; i < species.length; i++) {
            species[i].sort((a, b) => b.score - a.score)
            for (let j = 0; j < species[i].length; j++) {
                species[i][j].genome.species = i
            }
        }
        return species
    }

    cull(species) {
        for (let i = 0; i < species.length; i++) {
            if (species.length > 1 && species[i].length <= this.hyper.minSpecies && Math.random() < 0.50) {
                species[i] = []
                continue
            }
            const max = Math.floor((1 - this.hyper.cullRate) * species[i].length)
            if (species.length == 1 && max == 0) break
            species[i] = species[i].slice(0, max)
        }
        species = species.filter(s => s.length > 0)
        return species
    }

    breed(species) {
        const children = []
        const adjustedFitness = species.map(s => s.map(c => {
            return c.score / s.length
        }))
        const sFit = adjustedFitness.map(s => s.reduce((acc, c) => acc + c, 0) / s.length)
        if (Math.random() < this.hyper.dropRate) {
            const dropIndex = sFit.indexOf(Math.min(...sFit))
            sFit[dropIndex] = 0
            if (this.dropoffTracker[dropIndex] != undefined) delete this.dropoffTracker[dropIndex]
            if (this.prevSpecScores[dropIndex] != undefined) delete this.prevSpecScores[dropIndex]
        }
        const gFit = adjustedFitness.reduce((acc, s) => acc + s.reduce((acc, c) => acc + c, 0), 0) / adjustedFitness.reduce((acc, s) => acc + s.length, 0)
        this.currentPopFitness = gFit
        for (let i = 0; i < sFit.length; i++) {
            if (this.prevSpecScores[i] == undefined) {
                this.prevSpecScores[i] = sFit[i]
                continue
            }
            if (sFit[i] <= this.prevSpecScores[i]) {
                if (!this.dropoffTracker[i]) this.dropoffTracker[i] = 0
                this.dropoffTracker[i]++;
                if (this.dropoffTracker[i] >= this.hyper.dropoff) {
                    sFit[i] = 0
                }
            } else if (this.dropoffTracker[i] != undefined) {
                delete this.dropoffTracker[i]
                delete this.prevSpecScores[i]
                continue
            }
            this.prevSpecScores[i] = sFit[i]

        }
        for (let i = 0; i < species.length; i++) {
            let n = Math.round((sFit[i] / gFit) * species[i].length)
            while (n > 0) {
                if (Math.random() < this.hyper.cloneRate) {
                    const c1 = rouletteSelectClientArray(species[i])
                    children.push(new Client(c1.genome.copy()))
                } else {
                    const c1 = rouletteSelectClientArray(species[i])
                    const c2 = rouletteSelectClientArray(species[i])
                    const parents = [c1, c2]
                    parents.sort((a, b) => b.score - a.score)
                    const childGenome = this.crossover(parents[0].genome, parents[1].genome)
                    children.push(new Client(childGenome))
                }
                n--
            }
        }
        return children
    }

    mutate() {
        if (!this.pruning) {
            for (let i = 0; i < this.pop.length; i++) {
                this.pop[i].genome.augment(this)
            }
        } else {
            for (let i = 0; i < this.pop.length; i++) {
                this.pop[i].genome.simplify(this)
            }
        }
    }

    evolve() {
        this.pop.sort((a, b) => b.score - a.score)
        const elite = this.pop[0] //.slice(0, Math.floor(this.pop.length * this.hyper.elitism)).map(c => new Client(c.genome.copy()))
        let species = this.speciate()
        if (species.length > this.hyper.speciesTarget) this.hyper.threshold++;
        if (species.length < this.hyper.speciesTarget) this.hyper.threshold--;
        species = this.cull(species)
        this.pop = this.breed(species)
        if (this.pop.length + 1 < this.maxPop) {
            const blankCount = this.maxPop - (this.pop.length + 1)
            for (let i = 0; i < blankCount; i++) {
                const g = this.blankGenome()
                this.pop.push(new Client(g))
            }
        }
        this.mutate()
        this.pop.push(elite)
        if (this.currentPopFitness <= this.lastPopFitness) this.fitnessPlatauCount++;
        this.lastPopFitness = this.currentPopFitness
        const currentMCP = this.mcp()
        if (!this.pruning) {
            if (this.fitnessPlatauCount >= this.hyper.fitnessPlatauThreshold) {
                if (currentMCP >= this.nextPruneComplexity) {
                    this.pruning = true
                }
            }
        } else {
            if (currentMCP >= this.lastMCP) this.mcpFloorCount++;
            if (this.mcpFloorCount >= this.hyper.complexityFloorDelay) {
                this.pruning = false
                this.nextPruneComplexity = currentMCP + this.hyper.complexityThreshold
                this.fitnessPlatauCount = 0
            }
            this.lastMCP = currentMCP
        }
    }

    trainStep(getScore, best = -Infinity) {
        for (let i = 0; i < this.pop.length; i++) {
            const score = getScore(this.pop[i])
            this.pop[i].score = score
            if (score > best) {
                best = score
            }
        }
        return best
    }

    trainPopExternal(getScores) {
        this.pop = getScores(this.pop)
        this.evolve()
    }

    train(getScore, goal, log = true, targetLoss = 0.01) {
        let best = -Infinity
        let i = 0
        while (true) {
            const score = this.trainStep(getScore, best)
            if (score > best) {
                best = score
                if (log) {
                    const table = {}
                    table[i] = { "Best score": best }
                    console.table(table)
                }
                if (goal - best <= targetLoss) break
            }
            this.evolve()
            i++
        }
        this.pop.sort((a, b) => b.score - a.score)
        return this.pop[0]
    }

}