import type { CalendarDay } from "@/core/tracking";
import { formatDay } from "../format-day";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * The 30 days of the 30-day rate, Monday first. A learned day has a dot and a green border,
 * so it never depends on colour alone. Each day's name says "learned" or "not learned".
 */
export function LearningCalendar({ weeks }: { weeks: CalendarDay[][] }) {
  return (
    <table className="calendar">
      <caption className="visually-hidden">Learning calendar, last 30 days</caption>
      <thead>
        <tr>
          {WEEKDAYS.map((day) => (
            <th key={day} scope="col">
              {day}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {weeks.map((week) => (
          <tr key={week[0].day}>
            {week.map(({ day, status }) =>
              status === "outside" ? (
                <td key={day} />
              ) : (
                <td key={day} className={`calendar-${status}`}>
                  <span aria-hidden="true">
                    {Number(day.slice(8, 10))}
                    {status === "learned" && <span className="calendar-mark">●</span>}
                  </span>
                  <span className="visually-hidden">
                    {formatDay(day)}, {status === "learned" ? "learned" : "not learned"}
                  </span>
                </td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
