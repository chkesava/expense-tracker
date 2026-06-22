import { describe, it, expect } from "vitest";
import { parseAdvisorResponse } from "./MagicChatEntry";

describe("parseAdvisorResponse", () => {
  it("should parse normal text response without charts", () => {
    const text = "Hello! Here is your budget update for June. You spent ₹5,000 on Food.";
    const result = parseAdvisorResponse(text);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("text");
    expect(result[0].content).toBe(text);
  });

  it("should extract a single bar chart tag correctly", () => {
    const text = `Based on your Swiggy orders:
<chart type="bar" title="Swiggy Spending last week">
[
  {"label": "Mon", "value": 250},
  {"label": "Wed", "value": 500},
  {"label": "Fri", "value": 150}
]
</chart>
Keep it up!`;

    const result = parseAdvisorResponse(text);

    expect(result).toHaveLength(3);
    
    // First part: text before chart
    expect(result[0].type).toBe("text");
    expect(result[0].content.trim()).toBe("Based on your Swiggy orders:");

    // Second part: the chart
    expect(result[1].type).toBe("chart");
    expect(result[1].chartData?.type).toBe("bar");
    expect(result[1].chartData?.title).toBe("Swiggy Spending last week");
    expect(result[1].chartData?.data).toEqual([
      { label: "Mon", value: 250 },
      { label: "Wed", value: 500 },
      { label: "Fri", value: 150 }
    ]);

    // Third part: text after chart
    expect(result[2].type).toBe("text");
    expect(result[2].content.trim()).toBe("Keep it up!");
  });

  it("should handle multiple chart tags", () => {
    const text = `Here is a pie chart of your categories:
<chart type="pie" title="Category Breakdown">
[{"label": "Food", "value": 1000}, {"label": "Rent", "value": 5000}]
</chart>
And here is a daily line chart:
<chart type="line" title="Daily Spending">
[{"label": "06-01", "value": 100}, {"label": "06-02", "value": 200}]
</chart>`;

    const result = parseAdvisorResponse(text);

    expect(result).toHaveLength(4);
    expect(result[0].type).toBe("text");
    expect(result[1].type).toBe("chart");
    expect(result[1].chartData?.type).toBe("pie");
    expect(result[2].type).toBe("text");
    expect(result[3].type).toBe("chart");
    expect(result[3].chartData?.type).toBe("line");
  });

  it("should fallback to text if chart JSON is malformed", () => {
    const text = `Here is a broken chart:
<chart type="bar" title="Broken Chart">
[{"label": "Mon", "value": 250
</chart>`;

    const result = parseAdvisorResponse(text);

    // It should treat the broken chart block as normal text and combine/list it
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe("text");
    expect(result[1].type).toBe("text");
    expect(result[1].content).toContain('<chart type="bar" title="Broken Chart">');
  });
});
