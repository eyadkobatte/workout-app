export interface WorkoutSet {
  kg: number | null;
  reps: number | null;
}

export interface WorkoutExercise {
  name: string;
  sets: WorkoutSet[];
}

export interface Workout {
  id?: number;
  startedAt: number;
  endedAt: number | null; // null = workout in progress
  exercises: WorkoutExercise[];
}

export interface CustomExercise {
  id?: number;
  name: string;
  muscle: string;
}

const DB_NAME = "workout-db";
const DB_VERSION = 1;

// One connection for the page's lifetime, reused across operations.
let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("workouts")) {
        db.createObjectStore("workouts", { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains("customExercises")) {
        db.createObjectStore("customExercises", { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

/** Drops the cached connection so a fresh database can be opened (tests). */
export async function closeDb(): Promise<void> {
  if (!dbPromise) return;
  const db = await dbPromise;
  dbPromise = null;
  db.close();
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function store(name: "workouts" | "customExercises", mode: IDBTransactionMode) {
  const db = await openDb();
  return db.transaction(name, mode).objectStore(name);
}

export function getWorkouts(): Promise<Workout[]> {
  return store("workouts", "readonly").then((s) => request(s.getAll()));
}

export function getWorkout(id: number): Promise<Workout | undefined> {
  return store("workouts", "readonly").then((s) => request<Workout | undefined>(s.get(id)));
}

export async function putWorkout(workout: Workout): Promise<number> {
  const key = await request((await store("workouts", "readwrite")).put(workout));
  return Number(key);
}

export async function deleteWorkout(id: number): Promise<void> {
  await request((await store("workouts", "readwrite")).delete(id));
}

export function getCustomExercises(): Promise<CustomExercise[]> {
  return store("customExercises", "readonly").then((s) => request(s.getAll()));
}

export async function putCustomExercise(exercise: CustomExercise): Promise<number> {
  const key = await request((await store("customExercises", "readwrite")).put(exercise));
  return Number(key);
}
