export interface PriorityQueueItem<T> {
  value: T;
  priority: number;
}

export class PriorityQueue<T> {
  private heap: PriorityQueueItem<T>[];
  private valueToIndex: Map<T, number>;

  constructor() {
    this.heap = [];
    this.valueToIndex = new Map();
  }

  private parent(index: number): number {
    return Math.floor((index - 1) / 2);
  }

  private leftChild(index: number): number {
    return 2 * index + 1;
  }

  private rightChild(index: number): number {
    return 2 * index + 2;
  }

  private swap(i: number, j: number): void {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;

    this.valueToIndex.set(this.heap[i].value, i);
    this.valueToIndex.set(this.heap[j].value, j);
  }

  private heapifyUp(index: number): void {
    while (index > 0) {
      const parentIdx = this.parent(index);
      if (this.heap[index].priority >= this.heap[parentIdx].priority) {
        break;
      }
      this.swap(index, parentIdx);
      index = parentIdx;
    }
  }

  private heapifyDown(index: number): void {
    while (true) {
      let smallest = index;
      const left = this.leftChild(index);
      const right = this.rightChild(index);

      if (left < this.heap.length && this.heap[left].priority < this.heap[smallest].priority) {
        smallest = left;
      }

      if (right < this.heap.length && this.heap[right].priority < this.heap[smallest].priority) {
        smallest = right;
      }

      if (smallest === index) {
        break;
      }

      this.swap(index, smallest);
      index = smallest;
    }
  }

  insert(value: T, priority: number): void {
    if (typeof priority !== 'number' || !isFinite(priority)) {
      throw new Error('Priority must be a finite number');
    }

    if (this.valueToIndex.has(value)) {
      throw new Error('Value already exists in queue. Use decreaseKey to update priority.');
    }

    const item: PriorityQueueItem<T> = { value, priority };
    this.heap.push(item);
    const index = this.heap.length - 1;
    this.valueToIndex.set(value, index);
    this.heapifyUp(index);
  }

  extractMin(): T | undefined {
    if (this.isEmpty()) {
      return undefined;
    }

    if (this.heap.length === 1) {
      const item = this.heap.pop();
      if (item) {
        this.valueToIndex.delete(item.value);
        return item.value;
      }
      return undefined;
    }

    const min = this.heap[0];
    const last = this.heap.pop();

    if (last) {
      this.heap[0] = last;
      this.valueToIndex.set(last.value, 0);
      this.heapifyDown(0);
    }

    this.valueToIndex.delete(min.value);
    return min.value;
  }

  peek(): T | undefined {
    return this.heap[0]?.value;
  }

  peekPriority(): number | undefined {
    return this.heap[0]?.priority;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  size(): number {
    return this.heap.length;
  }

  clear(): void {
    this.heap = [];
    this.valueToIndex.clear();
  }

  contains(value: T): boolean {
    return this.valueToIndex.has(value);
  }

  decreaseKey(value: T, newPriority: number): void {
    if (typeof newPriority !== 'number' || !isFinite(newPriority)) {
      throw new Error('Priority must be a finite number');
    }

    const index = this.valueToIndex.get(value);

    if (index === undefined) {
      throw new Error('Value not found in queue');
    }

    const currentPriority = this.heap[index].priority;

    if (newPriority > currentPriority) {
      throw new Error('New priority must be less than or equal to current priority');
    }

    if (newPriority === currentPriority) {
      return;
    }

    this.heap[index].priority = newPriority;
    this.heapifyUp(index);
  }

  toArray(): PriorityQueueItem<T>[] {
    return this.heap.map((item) => ({ ...item }));
  }

  getPriority(value: T): number | undefined {
    const index = this.valueToIndex.get(value);
    if (index === undefined) {
      return undefined;
    }
    return this.heap[index].priority;
  }

  private validateHeapProperty(): boolean {
    for (let i = 0; i < this.heap.length; i++) {
      const left = this.leftChild(i);
      const right = this.rightChild(i);

      if (left < this.heap.length && this.heap[i].priority > this.heap[left].priority) {
        return false;
      }

      if (right < this.heap.length && this.heap[i].priority > this.heap[right].priority) {
        return false;
      }
    }
    return true;
  }

  isValid(): boolean {
    if (this.heap.length !== this.valueToIndex.size) {
      return false;
    }

    for (let i = 0; i < this.heap.length; i++) {
      const value = this.heap[i].value;
      const index = this.valueToIndex.get(value);
      if (index !== i) {
        return false;
      }
    }

    return this.validateHeapProperty();
  }
}
