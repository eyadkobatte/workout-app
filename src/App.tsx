import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { ThemeToggle } from "./components/ThemeToggle";
import { useHashRoute } from "./lib/router";
import { ExerciseDetail } from "./screens/ExerciseDetail";
import { Exercises } from "./screens/Exercises";
import { Home } from "./screens/Home";
import { Workout } from "./screens/Workout";

export default function App() {
  const route = useHashRoute();

  let screen: ReactNode;
  if (route === "/") {
    screen = <Home />;
  } else if (route.startsWith("/workout/")) {
    screen = <Workout id={route.split("/")[2]} />;
  } else if (route === "/exercises") {
    screen = <Exercises />;
  } else if (route.startsWith("/exercise/")) {
    screen = <ExerciseDetail name={decodeURIComponent(route.split("/")[2])} />;
  } else {
    screen = <Home />;
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 pb-16">
      <header className="flex items-center justify-between py-4">
        <a href="#/" className="text-lg font-bold tracking-tight">
          Workout App
        </a>
        <ThemeToggle />
      </header>
      <AnimatePresence mode="wait">
        <motion.main
          key={route}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {screen}
        </motion.main>
      </AnimatePresence>
    </div>
  );
}
