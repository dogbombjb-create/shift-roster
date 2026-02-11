
import MonthlyRoster from './components/MonthlyRoster';

export const metadata = {
  title: 'Monthly Shift Roster',
  description: 'Manage monthly shifts for U, I, K, T',
};

export default function Home() {
  return (
    <main>
      <MonthlyRoster />
    </main>
  );
}
