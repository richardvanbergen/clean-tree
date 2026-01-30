import { describe, expect, test } from "bun:test";
import type { Instruction } from "@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item";
import type { TreeItem } from "../primitives/types.ts";
import type {
	BranchHandlers,
	PendingItem,
	TreeEventListener,
	TreeEventType,
} from "./tree-root-context.tsx";

// --- Pure JS test harness (no React, no DOM) ---

function createEventEmitter(
	branchRegistry?: Map<string | null, BranchHandlers>,
) {
	const listeners = new Set<TreeEventListener>();
	const pendingItems = new Map<string | null, PendingItem[]>();
	const savedBranchState = new Map<string | null, TreeItem[]>();

	return {
		addEventListener(listener: TreeEventListener): () => void {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		dispatchEvent(event: TreeEventType) {
			listeners.forEach((listener) => {
				listener(event);
			});

			// Queue items for unmounted target branches (mirrors tree-root-context.tsx)
			if (event.type === "item-drop-requested" && branchRegistry) {
				const { sourceBranchId, targetBranchId, item, targetIndex } =
					event.payload;
				if (!branchRegistry.has(targetBranchId)) {
					const pending = pendingItems.get(targetBranchId) ?? [];
					pending.push({ item, index: targetIndex, sourceBranchId });
					pendingItems.set(targetBranchId, pending);
				}
			}
		},
		consumePendingItems(branchId: string | null): PendingItem[] {
			const pending = pendingItems.get(branchId) ?? [];
			pendingItems.delete(branchId);
			return pending;
		},
		saveBranchState(branchId: string | null, items: TreeItem[]) {
			savedBranchState.set(branchId, items);
		},
		consumeSavedBranchState(branchId: string | null): TreeItem[] | undefined {
			const saved = savedBranchState.get(branchId);
			savedBranchState.delete(branchId);
			return saved;
		},
	};
}

function createBranchRegistry() {
	const registry = new Map<string | null, BranchHandlers>();

	return {
		register(id: string | null, handlers: BranchHandlers): () => void {
			registry.set(id, handlers);
			return () => {
				registry.delete(id);
			};
		},

		findItemBranch(itemId: string): string | null | undefined {
			for (const [branchId, handlers] of registry.entries()) {
				if (handlers.containsItem(itemId)) return branchId;
			}
			return undefined;
		},

		getItem(itemId: string): TreeItem | undefined {
			for (const handlers of registry.values()) {
				const item = handlers.getItems().find((i) => i.id === itemId);
				if (item) return item;
			}
			return undefined;
		},

		getPathToItem(itemId: string): string[] {
			const path: string[] = [];

			function findInBranch(branchId: string | null): boolean {
				const handlers = registry.get(branchId);
				if (!handlers) return false;

				for (const item of handlers.getItems()) {
					if (item.id === itemId) return true;
					if (registry.has(item.id)) {
						if (findInBranch(item.id)) {
							path.unshift(item.id);
							return true;
						}
					}
				}
				return false;
			}

			findInBranch(null);
			return path;
		},

		itemHasChildren(
			itemId: string,
			initialData?: Map<string | null, TreeItem[]>,
		): boolean {
			const handlers = registry.get(itemId);
			if (handlers) return handlers.getItems().length > 0;
			return (initialData?.get(itemId)?.length ?? 0) > 0;
		},

		_registry: registry,
	};
}

/**
 * Creates a test branch that mirrors the behavior of TreeBranch:
 * - Maintains a mutable items array
 * - Registers with the branch registry
 * - Subscribes to drop events and applies add/remove/reorder
 */
function createTestBranch(
	id: string | null,
	initialItems: TreeItem[],
	emitter: ReturnType<typeof createEventEmitter>,
	registry: ReturnType<typeof createBranchRegistry>,
) {
	// Restore saved state from a previous unmount, or use initial items
	// (mirrors TreeBranch's useState lazy initializer)
	let items = emitter.consumeSavedBranchState(id) ?? [...initialItems];

	// Register handlers (same as BranchHandlers in tree-root-context)
	const handlers: BranchHandlers = {
		getItems: () => items,
		containsItem: (itemId: string) => items.some((i) => i.id === itemId),
	};
	const unregister = registry.register(id, handlers);

	// Consume pending items from drops that targeted this branch before it existed
	// (mirrors tree-branch.tsx useEffect that calls consumePendingItems on mount)
	const pending = emitter.consumePendingItems(id);
	for (const { item, index } of pending) {
		const newItems = [...items];
		const clampedIndex = Math.min(index, newItems.length);
		newItems.splice(clampedIndex, 0, item);
		items = newItems;
		emitter.dispatchEvent({
			type: "item-added",
			payload: { branchId: id, itemId: item.id },
		});
	}

	// Subscribe to events (same logic as tree-branch.tsx useEffect)
	const unsubscribe = emitter.addEventListener((event) => {
		if (event.type === "item-drop-requested") {
			const { item, sourceBranchId, targetBranchId, targetIndex } =
				event.payload;

			// Same branch reorder
			if (sourceBranchId === id && targetBranchId === id) {
				const fromIndex = items.findIndex((i) => i.id === item.id);
				if (fromIndex === -1) return;
				const newItems = [...items];
				const removed = newItems.splice(fromIndex, 1);
				if (!removed[0]) return;
				const adjustedIndex =
					targetIndex > fromIndex ? targetIndex - 1 : targetIndex;
				newItems.splice(adjustedIndex, 0, removed[0]);
				items = newItems;
				return;
			}

			// Source: remove
			if (sourceBranchId === id) {
				items = items.filter((i) => i.id !== item.id);
			}

			// Target: add
			if (targetBranchId === id) {
				const newItems = [...items];
				const clampedIndex = Math.min(targetIndex, newItems.length);
				newItems.splice(clampedIndex, 0, item);
				items = newItems;
				emitter.dispatchEvent({
					type: "item-added",
					payload: { branchId: id, itemId: item.id },
				});
			}
		}
	});

	return {
		getItems: () => items,
		getItemIds: () => items.map((i) => i.id),
		cleanup: () => {
			// Save state before unregistering (mirrors registerBranch cleanup)
			emitter.saveBranchState(id, handlers.getItems());
			unregister();
			unsubscribe();
		},
	};
}

/** Convenience: create emitter + registry + multiple branches */
function createTestTree(
	branches: Array<{ id: string | null; items: TreeItem[] }>,
) {
	const registry = createBranchRegistry();
	const emitter = createEventEmitter(registry._registry);
	const branchMap = new Map<
		string | null,
		ReturnType<typeof createTestBranch>
	>();

	for (const { id, items } of branches) {
		branchMap.set(id, createTestBranch(id, items, emitter, registry));
	}

	return {
		emitter,
		registry,
		branch(id: string | null) {
			// biome-ignore lint/style/noNonNullAssertion: test helper, branch must exist
			return branchMap.get(id)!;
		},
		cleanup() {
			branchMap.forEach((b) => {
				b.cleanup();
			});
		},
	};
}

// --- Tests ---

describe("Event emitter", () => {
	test("listeners receive dispatched events", () => {
		const emitter = createEventEmitter();
		const events: TreeEventType[] = [];

		emitter.addEventListener((e) => events.push(e));
		emitter.dispatchEvent({
			type: "item-added",
			payload: { branchId: null, itemId: "test" },
		});

		expect(events).toHaveLength(1);
		expect(events[0]?.type).toBe("item-added");
	});

	test("cleanup function removes listener", () => {
		const emitter = createEventEmitter();
		const events: TreeEventType[] = [];

		const cleanup = emitter.addEventListener((e) => events.push(e));
		cleanup();

		emitter.dispatchEvent({
			type: "item-added",
			payload: { branchId: null, itemId: "test" },
		});

		expect(events).toHaveLength(0);
	});

	test("multiple listeners all receive events", () => {
		const emitter = createEventEmitter();
		const events1: TreeEventType[] = [];
		const events2: TreeEventType[] = [];

		emitter.addEventListener((e) => events1.push(e));
		emitter.addEventListener((e) => events2.push(e));

		emitter.dispatchEvent({
			type: "item-added",
			payload: { branchId: null, itemId: "x" },
		});

		expect(events1).toHaveLength(1);
		expect(events2).toHaveLength(1);
	});
});

describe("Branch registry", () => {
	test("findItemBranch returns correct branch ID", () => {
		const registry = createBranchRegistry();

		registry.register(null, {
			getItems: () => [{ id: "A" }, { id: "B" }],
			containsItem: (id) => id === "A" || id === "B",
		});
		registry.register("A", {
			getItems: () => [{ id: "A1" }, { id: "A2" }],
			containsItem: (id) => id === "A1" || id === "A2",
		});

		expect(registry.findItemBranch("A")).toBe(null);
		expect(registry.findItemBranch("B")).toBe(null);
		expect(registry.findItemBranch("A1")).toBe("A");
		expect(registry.findItemBranch("A2")).toBe("A");
		expect(registry.findItemBranch("nonexistent")).toBeUndefined();
	});

	test("getItem returns item data from any branch", () => {
		const registry = createBranchRegistry();

		registry.register(null, {
			getItems: () => [{ id: "X", isFolder: true }, { id: "Y" }],
			containsItem: (id) => id === "X" || id === "Y",
		});

		expect(registry.getItem("X")).toEqual({ id: "X", isFolder: true });
		expect(registry.getItem("Y")).toEqual({ id: "Y" });
		expect(registry.getItem("Z")).toBeUndefined();
	});

	test("getPathToItem returns ancestor path", () => {
		const registry = createBranchRegistry();

		registry.register(null, {
			getItems: () => [{ id: "A" }, { id: "B" }],
			containsItem: (id) => id === "A" || id === "B",
		});
		registry.register("A", {
			getItems: () => [{ id: "A1" }, { id: "A2" }],
			containsItem: (id) => id === "A1" || id === "A2",
		});
		registry.register("A1", {
			getItems: () => [{ id: "A1a" }],
			containsItem: (id) => id === "A1a",
		});

		expect(registry.getPathToItem("A")).toEqual([]);
		expect(registry.getPathToItem("A1")).toEqual(["A"]);
		expect(registry.getPathToItem("A1a")).toEqual(["A", "A1"]);
		expect(registry.getPathToItem("B")).toEqual([]);
	});

	test("itemHasChildren checks registry then initial data", () => {
		const registry = createBranchRegistry();

		registry.register("A", {
			getItems: () => [{ id: "A1" }],
			containsItem: (id) => id === "A1",
		});

		// Branch "A" is registered with items
		expect(registry.itemHasChildren("A")).toBe(true);

		// Branch "B" is not registered, no initial data
		expect(registry.itemHasChildren("B")).toBe(false);

		// Branch "C" is not registered but has initial data
		const initialData = new Map<string | null, TreeItem[]>();
		initialData.set("C", [{ id: "C1" }]);
		expect(registry.itemHasChildren("C", initialData)).toBe(true);
	});
});

describe("Same-branch reorder", () => {
	test("move item downward (A,B,C → B,C,A)", () => {
		const tree = createTestTree([
			{ id: null, items: [{ id: "A" }, { id: "B" }, { id: "C" }] },
		]);

		tree.emitter.dispatchEvent({
			type: "item-drop-requested",
			payload: {
				itemId: "A",
				item: { id: "A" },
				sourceBranchId: null,
				targetBranchId: null,
				targetIndex: 3,
				instruction: {
					type: "reorder-below",
					currentLevel: 0,
					indentPerLevel: 20,
				} satisfies Instruction,
			},
		});

		expect(tree.branch(null).getItemIds()).toEqual(["B", "C", "A"]);
		tree.cleanup();
	});

	test("move item upward (A,B,C → C,A,B)", () => {
		const tree = createTestTree([
			{ id: null, items: [{ id: "A" }, { id: "B" }, { id: "C" }] },
		]);

		tree.emitter.dispatchEvent({
			type: "item-drop-requested",
			payload: {
				itemId: "C",
				item: { id: "C" },
				sourceBranchId: null,
				targetBranchId: null,
				targetIndex: 0,
				instruction: {
					type: "reorder-above",
					currentLevel: 0,
					indentPerLevel: 20,
				} satisfies Instruction,
			},
		});

		expect(tree.branch(null).getItemIds()).toEqual(["C", "A", "B"]);
		tree.cleanup();
	});

	test("move to same position is a no-op", () => {
		const tree = createTestTree([
			{ id: null, items: [{ id: "A" }, { id: "B" }, { id: "C" }] },
		]);

		// B is at index 1; reorder to index 1 should be no-op
		tree.emitter.dispatchEvent({
			type: "item-drop-requested",
			payload: {
				itemId: "B",
				item: { id: "B" },
				sourceBranchId: null,
				targetBranchId: null,
				targetIndex: 1,
				instruction: {
					type: "reorder-above",
					currentLevel: 0,
					indentPerLevel: 20,
				} satisfies Instruction,
			},
		});

		expect(tree.branch(null).getItemIds()).toEqual(["A", "B", "C"]);
		tree.cleanup();
	});
});

describe("Cross-branch move", () => {
	test("root → child branch", () => {
		const tree = createTestTree([
			{
				id: null,
				items: [{ id: "A", isFolder: true }, { id: "B" }, { id: "C" }],
			},
			{ id: "A", items: [{ id: "A1" }] },
		]);

		tree.emitter.dispatchEvent({
			type: "item-drop-requested",
			payload: {
				itemId: "B",
				item: { id: "B" },
				sourceBranchId: null,
				targetBranchId: "A",
				targetIndex: 0,
				instruction: {
					type: "make-child",
					currentLevel: 0,
					indentPerLevel: 20,
				} satisfies Instruction,
			},
		});

		expect(tree.branch(null).getItemIds()).toEqual(["A", "C"]);
		expect(tree.branch("A").getItemIds()).toEqual(["B", "A1"]);
		tree.cleanup();
	});

	test("child → root branch", () => {
		const tree = createTestTree([
			{ id: null, items: [{ id: "A", isFolder: true }, { id: "B" }] },
			{ id: "A", items: [{ id: "A1" }, { id: "A2" }] },
		]);

		tree.emitter.dispatchEvent({
			type: "item-drop-requested",
			payload: {
				itemId: "A1",
				item: { id: "A1" },
				sourceBranchId: "A",
				targetBranchId: null,
				targetIndex: 2,
				instruction: {
					type: "reorder-below",
					currentLevel: 0,
					indentPerLevel: 20,
				} satisfies Instruction,
			},
		});

		expect(tree.branch(null).getItemIds()).toEqual(["A", "B", "A1"]);
		expect(tree.branch("A").getItemIds()).toEqual(["A2"]);
		tree.cleanup();
	});

	test("child → different child branch", () => {
		const tree = createTestTree([
			{
				id: null,
				items: [
					{ id: "A", isFolder: true },
					{ id: "B", isFolder: true },
				],
			},
			{ id: "A", items: [{ id: "A1" }, { id: "A2" }] },
			{ id: "B", items: [{ id: "B1" }] },
		]);

		tree.emitter.dispatchEvent({
			type: "item-drop-requested",
			payload: {
				itemId: "A1",
				item: { id: "A1" },
				sourceBranchId: "A",
				targetBranchId: "B",
				targetIndex: 1,
				instruction: {
					type: "reorder-below",
					currentLevel: 0,
					indentPerLevel: 20,
				} satisfies Instruction,
			},
		});

		expect(tree.branch("A").getItemIds()).toEqual(["A2"]);
		expect(tree.branch("B").getItemIds()).toEqual(["B1", "A1"]);
		tree.cleanup();
	});

	test("item-added event fires after add", () => {
		const tree = createTestTree([
			{ id: null, items: [{ id: "A" }, { id: "B" }] },
			{ id: "A", items: [{ id: "A1" }] },
		]);

		const addedEvents: TreeEventType[] = [];
		tree.emitter.addEventListener((e) => {
			if (e.type === "item-added") addedEvents.push(e);
		});

		tree.emitter.dispatchEvent({
			type: "item-drop-requested",
			payload: {
				itemId: "B",
				item: { id: "B" },
				sourceBranchId: null,
				targetBranchId: "A",
				targetIndex: 0,
				instruction: {
					type: "make-child",
					currentLevel: 0,
					indentPerLevel: 20,
				} satisfies Instruction,
			},
		});

		expect(addedEvents).toHaveLength(1);
		// biome-ignore lint/style/noNonNullAssertion: length asserted above
		const addedEvent = addedEvents[0]!;
		expect(addedEvent.type).toBe("item-added");
		if (addedEvent.type === "item-added") {
			expect(addedEvent.payload.itemId).toBe("B");
			expect(addedEvent.payload.branchId).toBe("A");
		}
		tree.cleanup();
	});
});

describe("Listener ordering (race condition regression)", () => {
	test("move succeeds regardless of branch registration order", () => {
		// Branch A registered first, Branch B second.
		// When dispatching a move from A→B, A's listener fires first (removes),
		// then B's listener fires (adds). Both work independently because
		// the item data is in the payload.
		const tree = createTestTree([
			{ id: "A", items: [{ id: "X" }, { id: "Y" }] },
			{ id: "B", items: [{ id: "Z" }] },
		]);

		tree.emitter.dispatchEvent({
			type: "item-drop-requested",
			payload: {
				itemId: "X",
				item: { id: "X" },
				sourceBranchId: "A",
				targetBranchId: "B",
				targetIndex: 0,
				instruction: {
					type: "reorder-above",
					currentLevel: 0,
					indentPerLevel: 20,
				} satisfies Instruction,
			},
		});

		expect(tree.branch("A").getItemIds()).toEqual(["Y"]);
		expect(tree.branch("B").getItemIds()).toEqual(["X", "Z"]);
		tree.cleanup();
	});

	test("move succeeds with reversed registration order", () => {
		// Register B first, then A — opposite order
		const emitter = createEventEmitter();
		const registry = createBranchRegistry();

		const branchB = createTestBranch("B", [{ id: "Z" }], emitter, registry);
		const branchA = createTestBranch(
			"A",
			[{ id: "X" }, { id: "Y" }],
			emitter,
			registry,
		);

		emitter.dispatchEvent({
			type: "item-drop-requested",
			payload: {
				itemId: "X",
				item: { id: "X" },
				sourceBranchId: "A",
				targetBranchId: "B",
				targetIndex: 0,
				instruction: {
					type: "reorder-above",
					currentLevel: 0,
					indentPerLevel: 20,
				} satisfies Instruction,
			},
		});

		expect(branchA.getItemIds()).toEqual(["Y"]);
		expect(branchB.getItemIds()).toEqual(["X", "Z"]);

		branchA.cleanup();
		branchB.cleanup();
	});
});

describe("Edge cases", () => {
	test("move to index beyond array length clamps", () => {
		const tree = createTestTree([
			{ id: null, items: [{ id: "A" }, { id: "B" }] },
			{ id: "A", items: [] },
		]);

		tree.emitter.dispatchEvent({
			type: "item-drop-requested",
			payload: {
				itemId: "B",
				item: { id: "B" },
				sourceBranchId: null,
				targetBranchId: "A",
				targetIndex: 999,
				instruction: {
					type: "reorder-below",
					currentLevel: 0,
					indentPerLevel: 20,
				} satisfies Instruction,
			},
		});

		expect(tree.branch(null).getItemIds()).toEqual(["A"]);
		expect(tree.branch("A").getItemIds()).toEqual(["B"]);
		tree.cleanup();
	});

	test("move item that does not exist in source is a no-op for source", () => {
		const tree = createTestTree([
			{ id: null, items: [{ id: "A" }, { id: "B" }] },
			{ id: "X", items: [{ id: "X1" }] },
		]);

		// Claim source is branch X, but item 'ghost' doesn't exist there
		tree.emitter.dispatchEvent({
			type: "item-drop-requested",
			payload: {
				itemId: "ghost",
				item: { id: "ghost" },
				sourceBranchId: "X",
				targetBranchId: null,
				targetIndex: 0,
				instruction: {
					type: "reorder-above",
					currentLevel: 0,
					indentPerLevel: 20,
				} satisfies Instruction,
			},
		});

		// Source unchanged (filter for non-existent item is harmless)
		expect(tree.branch("X").getItemIds()).toEqual(["X1"]);
		// Target got the item (it trusts the payload)
		expect(tree.branch(null).getItemIds()).toEqual(["ghost", "A", "B"]);
		tree.cleanup();
	});

	test("make-child on item with no existing branch queues item for late mount", () => {
		const registry = createBranchRegistry();
		const emitter = createEventEmitter(registry._registry);

		// Only root branch exists — no branch for 'A'
		const root = createTestBranch(
			null,
			[{ id: "A" }, { id: "B" }],
			emitter,
			registry,
		);

		// Dispatch a move targeting branch 'A' which doesn't exist yet
		emitter.dispatchEvent({
			type: "item-drop-requested",
			payload: {
				itemId: "B",
				item: { id: "B" },
				sourceBranchId: null,
				targetBranchId: "A",
				targetIndex: 0,
				instruction: {
					type: "make-child",
					currentLevel: 0,
					indentPerLevel: 20,
				} satisfies Instruction,
			},
		});

		// Source removed the item
		expect(root.getItemIds()).toEqual(["A"]);

		// Now branch 'A' mounts (e.g. after expandItem triggers React render)
		const branchA = createTestBranch("A", [], emitter, registry);

		// The pending item should have been picked up on mount
		expect(branchA.getItemIds()).toEqual(["B"]);

		root.cleanup();
		branchA.cleanup();
	});

	test("moving parent preserves child branch state across unmount/remount", () => {
		// Scenario: Drop B into A (B becomes child of A), then drop A into C.
		// A's child branch unmounts when A leaves root, then remounts under C.
		// B should still be in A's children.
		const registry = createBranchRegistry();
		const emitter = createEventEmitter(registry._registry);

		const root = createTestBranch(
			null,
			[{ id: "A", isFolder: true }, { id: "B" }, { id: "C" }],
			emitter,
			registry,
		);
		const branchA = createTestBranch("A", [], emitter, registry);

		// Step 1: Drop B into A (make-child)
		emitter.dispatchEvent({
			type: "item-drop-requested",
			payload: {
				itemId: "B",
				item: { id: "B" },
				sourceBranchId: null,
				targetBranchId: "A",
				targetIndex: 0,
				instruction: {
					type: "make-child",
					currentLevel: 0,
					indentPerLevel: 20,
				} satisfies Instruction,
			},
		});

		expect(root.getItemIds()).toEqual(["A", "C"]);
		expect(branchA.getItemIds()).toEqual(["B"]);

		// Step 2: A moves from root to C (make-child).
		// Simulate what React does: branch A unmounts (cleanup), then remounts.
		branchA.cleanup(); // branch A unmounts — state [B] saved

		emitter.dispatchEvent({
			type: "item-drop-requested",
			payload: {
				itemId: "A",
				item: { id: "A", isFolder: true },
				sourceBranchId: null,
				targetBranchId: "C",
				targetIndex: 0,
				instruction: {
					type: "make-child",
					currentLevel: 0,
					indentPerLevel: 20,
				} satisfies Instruction,
			},
		});

		expect(root.getItemIds()).toEqual(["C"]);

		// C's branch mounts (picks up A from pending items)
		const branchC = createTestBranch("C", [], emitter, registry);
		expect(branchC.getItemIds()).toEqual(["A"]);

		// Branch A remounts under C — should restore saved state [B]
		const branchA2 = createTestBranch("A", [], emitter, registry);
		expect(branchA2.getItemIds()).toEqual(["B"]);

		root.cleanup();
		branchC.cleanup();
		branchA2.cleanup();
	});
});
