export default function SaveLoad() {
  function saveGame() {
    alert("Game saved. Later, this will connect to MongoDB.");
  }

  function loadGame() {
    alert("Game loaded. Later, this will get saved data from MongoDB.");
  }

  return (
    <main className="page">
      <h1>Save and Load Game</h1>

      <p>
        Save your progress so you can continue your stock market journey later.
      </p>

      <button onClick={saveGame}>Save Game</button>
      <button onClick={loadGame}>Load Game</button>
    </main>
  );
}