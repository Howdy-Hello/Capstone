type LeaderboardPlayer = {
  id: string;
  username: string;
  netWorth: number;
  cash: number;
  rank: number;
};

const mockPlayers: LeaderboardPlayer[] = [
  {
    id: "1",
    username: "MarketKing",
    netWorth: 52000,
    cash: 12000,
    rank: 1
  },
  {
    id: "2",
    username: "StockWizard",
    netWorth: 43000,
    cash: 8500,
    rank: 2
  },
  {
    id: "3",
    username: "BullTrader",
    netWorth: 39000,
    cash: 10000,
    rank: 3
  }
];

export default function Leaderboard() {
  return (
    <main className="page">
      <h1>Leaderboard</h1>
      <p>Compare your performance with other players.</p>

      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Net Worth</th>
            <th>Cash</th>
          </tr>
        </thead>

        <tbody>
          {mockPlayers.map((player) => (
            <tr key={player.id}>
              <td>#{player.rank}</td>
              <td>{player.username}</td>
              <td>${player.netWorth.toLocaleString()}</td>
              <td>${player.cash.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
