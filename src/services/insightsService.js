// Mock implementation that simulates AI processing
export async function generateInsights(analysisData) {
  // In a real implementation, this would be an API call to your AI service
  return new Promise((resolve) => {
    // Simulate processing time
    setTimeout(() => {
      // Generate simple insights based on the data
      const insights = generateMockInsights(analysisData);
      resolve(insights);
    }, 2000); // 2 second delay to simulate processing
  });
}

function generateMockInsights(analysisData) {
  const { selections, data } = analysisData;
  
  // Count transactions
  const transactionCount = data.length;
  
  // Calculate total value
  const totalValue = data.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
  
  // Find most common values
  const merchants = countFrequency(data, 'merchant_name');
  const topMerchant = merchants.length > 0 ? merchants[0].name : 'N/A';
  
  // Generate insights text
  let insightsText = [];
  
  // Add selection context
  if (selections.day) {
    insightsText.push(`On ${selections.day}, there were ${transactionCount} transactions totaling $${totalValue.toFixed(2)}.`);
  } else if (selections.sankey) {
    insightsText.push(`For ${selections.sankey}, there were ${transactionCount} transactions totaling $${totalValue.toFixed(2)}.`);
  } else if (selections.city) {
    insightsText.push(`In ${selections.city}, there were ${transactionCount} transactions totaling $${totalValue.toFixed(2)}.`);
  }
  
  // Add merchant insights
  if (merchants.length > 0) {
    insightsText.push(`The most frequent merchant was ${topMerchant} with ${merchants[0].count} transactions.`);
  }
  
  // Add transaction pattern insights
  if (transactionCount > 5) {
    insightsText.push(`The average transaction amount was $${(totalValue / transactionCount).toFixed(2)}.`);
  }
  
  // Add relationship insights
  if (selections.day && selections.city) {
    insightsText.push(`This shows a strong temporal-geographic relationship between ${selections.day} and ${selections.city}.`);
  }
  
  return {
    summary: insightsText.join(' '),
    details: {
      transactionCount,
      totalValue: totalValue.toFixed(2),
      topMerchant,
      averageAmount: transactionCount > 0 ? (totalValue / transactionCount).toFixed(2) : '0.00'
    }
  };
}

// Helper function to count frequency of values in a dataset
function countFrequency(data, field) {
  const counts = {};
  data.forEach(item => {
    const value = item[field];
    counts[value] = (counts[value] || 0) + 1;
  });
  
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
} 