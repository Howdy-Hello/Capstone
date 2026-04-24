type Achievement = {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
};

const achievements: Achievement[] = [
  {
    id: "1",
    title: "First Trade",
    description: "Buy your first stock.",
    unlocked: true
  },
  {
    id: "2",
    title: "Smart Investor",
    description: "Reach a net worth of $15,000.",
    unlocked: false
  },
  {
    id: "3",
    title: "Risk Taker",
    description: "Invest in three different companies.",
    unlocked: false
  },
  {
    id: "4",
    title: "Market Master",
    description: "Reach a net worth of $50,000.",
    unlocked: false
  }
];

export default function Achievements() {
  return (
    <main className="page">
      <h1>Achievements</h1>

      <div>
        {achievements.map((achievement) => (
          <section key={achievement.id}>
            <h2>
              {achievement.unlocked ? "✅" : "🔒"} {achievement.title}
            </h2>
            <p>{achievement.description}</p>
            <p>
              Status: {achievement.unlocked ? "Unlocked" : "Locked"}
            </p>
          </section>
        ))}
      </div>
    </main>
  );
}
