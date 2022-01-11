const gaussianRand = (n = 6) => {
    var rand = 0;
    for (var i = 0; i < n; i++) {
        rand += Math.random();
    }
    return rand / n;
}

const randomStd0 = () => (gaussianRand() - 0.5) * 2

const randomRange = (min, max) => min + (Math.random() * (max - min + 1))

const randomInt = (min, max) => Math.floor(randomRange(min, max))

const sigmoid = (val) => 1 / (1 + Math.exp(-val))