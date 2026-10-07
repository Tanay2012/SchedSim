export function findDeadlock(program) {
    const tids = program.threads.map(t => t.id);
    const ops = {};
    program.threads.forEach(t => ops[t.id] = t.ops);

    // Initial state: Array of program counters (all 0), and an empty lock owners object
    const initState = { pcs: new Array(tids.length).fill(0), owners: {} };
    const stack = [{ state: initState, trace: [] }];
    const seen = new Set();

    while (stack.length > 0) {
        const { state: { pcs, owners }, trace } = stack.pop();
        
        // Hash the state to avoid exploring the same path twice
        const stateHash = JSON.stringify({ pcs, owners: Object.entries(owners).sort() });
        if (seen.has(stateHash)) continue;
        seen.add(stateHash);

        let moved = false;
        let unfinished = false;

        for (let i = 0; i < tids.length; i++) {
            const tid = tids[i];
            if (pcs[i] >= ops[tid].length) continue;
            unfinished = true;

            const op = ops[tid][pcs[i]];

            // If it's trying to acquire a lock someone else owns, it blocks
            if (op.op === "acquire" && owners[op.target] && owners[op.target] !== tid) {
                continue;
            }

            moved = true;
            const newOwners = { ...owners };
            
            if (op.op === "acquire") newOwners[op.target] = tid;
            if (op.op === "release") delete newOwners[op.target];

            const newPcs = [...pcs];
            newPcs[i]++;

            stack.push({
                state: { pcs: newPcs, owners: newOwners },
                trace: [...trace, { thread: tid, step: pcs[i], action: op }]
            });
        }

        // If nobody could move but there are still unfinished threads -> DEADLOCK
        if (!moved && unfinished) {
            return {
                verdict: "deadlock",
                trace: trace,
                stuckState: { pcs, owners }
            };
        }
    }

    return { verdict: "safe" };
}