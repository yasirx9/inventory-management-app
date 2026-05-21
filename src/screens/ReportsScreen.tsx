import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Share } from 'react-native';
import { 
  Text, 
  Card, 
  Button, 
  Surface, 
  ActivityIndicator, 
  Divider,
  List,
  IconButton,
  TextInput,
  DataTable
} from 'react-native-paper';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { listenToData } from '../services/database';
import { Item, StockMovement, Project, StockTransfer } from '../types';

export default function ReportsScreen() {
  // Database States
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);

  // Collapsible Accordion states
  const [inventoryExpanded, setInventoryExpanded] = useState(true);
  const [movementsExpanded, setMovementsExpanded] = useState(false);
  const [projectsExpanded, setProjectsExpanded] = useState(false);
  const [transfersExpanded, setTransfersExpanded] = useState(false);

  // Stock movements filters: YYYY-MM-DD
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  useEffect(() => {
    // 1. Subscribe to Items
    const unsubItems = listenToData<Record<string, Item>>('items', (data) => {
      setItems(data ? Object.values(data) : []);
    });

    // 2. Subscribe to Stock Movements
    const unsubMovements = listenToData<Record<string, StockMovement>>('stock_movements', (data) => {
      setMovements(data ? Object.values(data) : []);
    });

    // 3. Subscribe to Projects
    const unsubProjects = listenToData<Record<string, Project>>('projects', (data) => {
      setProjects(data ? Object.values(data) : []);
    });

    // 4. Subscribe to Stock Transfers
    const unsubTransfers = listenToData<Record<string, StockTransfer>>('stock_transfers', (data) => {
      setTransfers(data ? Object.values(data) : []);
      setLoading(false);
    });

    return () => {
      unsubItems();
      unsubMovements();
      unsubProjects();
      unsubTransfers();
    };
  }, []);

  // --- Calculations for Inventory Report ---
  const totalItemsCount = items.length;
  const totalInventoryValue = items.reduce((acc, curr) => acc + ((curr.cost || 0) * (curr.quantity || 0)), 0);

  // Group items by category
  const categoriesMap: Record<string, { count: number; value: number }> = {};
  items.forEach(i => {
    const cat = i.category || 'Uncategorized';
    if (!categoriesMap[cat]) {
      categoriesMap[cat] = { count: 0, value: 0 };
    }
    categoriesMap[cat].count += 1;
    categoriesMap[cat].value += (i.cost || 0) * (i.quantity || 0);
  });

  const lowStockItems = items.filter(i => i.quantity <= i.reorder_level && i.quantity > 0);
  const outOfStockItems = items.filter(i => i.quantity <= 0);

  // --- Calculations for Stock Movements ---
  // Filter by date range
  const filteredMovements = movements.filter(m => {
    if (!m.created_at) return false;
    const mDate = m.created_at.split('T')[0];
    return mDate >= fromDate && mDate <= toDate;
  });

  const totalStockIn = filteredMovements.filter(m => m.type === 'in').length;
  const totalStockOut = filteredMovements.filter(m => m.type === 'out').length;

  // --- Calculations for Projects ---
  const projectsByStatus: Record<string, number> = {
    Planning: 0,
    Active: 0,
    'On Hold': 0,
    Completed: 0,
    Cancelled: 0
  };
  projects.forEach(p => {
    if (projectsByStatus[p.status] !== undefined) {
      projectsByStatus[p.status] += 1;
    }
  });

  const totalBudget = projects.reduce((acc, curr) => acc + (curr.budget || 0), 0);
  const totalActualCost = projects.reduce((acc, curr) => acc + (curr.actual_cost || 0), 0);

  const overBudgetProjects = projects.filter(p => p.actual_cost > p.budget);
  const delayedProjects = projects.filter(p => {
    if (p.status === 'Completed' || p.status === 'Cancelled') return false;
    if (!p.end_date) return false;
    return new Date(p.end_date).getTime() < new Date().getTime();
  });

  // --- Calculations for Transfers ---
  const pendingTransfersCount = transfers.filter(t => t.status === 'Pending').length;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const completedTransfersLast30 = transfers.filter(t => 
    t.status === 'Completed' && new Date(t.created_at).getTime() >= thirtyDaysAgo.getTime()
  ).length;

  const rejectedTransfersLast30 = transfers.filter(t => 
    (t.status === 'Rejected' || t.status === 'Receipt Rejected') && 
    new Date(t.created_at).getTime() >= thirtyDaysAgo.getTime()
  ).length;

  // --- Share / Export Report Logic ---
  const handleExportText = async () => {
    let reportText = `=======================================\n`;
    reportText += `     EIH INVENTORY ANALYTICS REPORT\n`;
    reportText += `     Date Generated: ${new Date().toLocaleDateString()}\n`;
    reportText += `=======================================\n\n`;

    // Section 1: Inventory
    reportText += `1. INVENTORY SUMMARY REPORT\n`;
    reportText += `---------------------------------------\n`;
    reportText += `* Total Items in Catalog: ${totalItemsCount}\n`;
    reportText += `* Total Catalog Net Worth: $${totalInventoryValue.toLocaleString()}\n`;
    reportText += `* Net Worth breakdown by Category:\n`;
    Object.entries(categoriesMap).forEach(([cat, data]) => {
      reportText += `  - ${cat}: ${data.count} items (Worth: $${data.value.toLocaleString()})\n`;
    });
    reportText += `* Low Stock Alerts (${lowStockItems.length} items):\n`;
    lowStockItems.forEach(i => {
      reportText += `  - ${i.item_name}: Qty ${i.quantity} (Reorder trigger: ${i.reorder_level})\n`;
    });
    reportText += `* Out of Stock Items (${outOfStockItems.length} items):\n`;
    outOfStockItems.forEach(i => {
      reportText += `  - ${i.item_name} (SKU: ${i.sku})\n`;
    });
    reportText += `\n`;

    // Section 2: Movements
    reportText += `2. STOCK MOVEMENT REPORT (${fromDate} to ${toDate})\n`;
    reportText += `---------------------------------------\n`;
    reportText += `* Total Inbound Stock-in Actions: ${totalStockIn}\n`;
    reportText += `* Total Outbound Stock-out Actions: ${totalStockOut}\n`;
    reportText += `\n`;

    // Section 3: Projects
    reportText += `3. PROJECT SUMMARY REPORT\n`;
    reportText += `---------------------------------------\n`;
    reportText += `* Projects Status Counts:\n`;
    Object.entries(projectsByStatus).forEach(([status, count]) => {
      reportText += `  - ${status}: ${count} projects\n`;
    });
    reportText += `* Cumulative Global Budgets: $${totalBudget.toLocaleString()}\n`;
    reportText += `* Cumulative Net actual Cost: $${totalActualCost.toLocaleString()}\n`;
    reportText += `* Cost-Overrun Projects (${overBudgetProjects.length} items):\n`;
    overBudgetProjects.forEach(p => {
      reportText += `  - ${p.name}: Budget $${p.budget.toLocaleString()} / Expended: $${p.actual_cost.toLocaleString()}\n`;
    });
    reportText += `* Overdue Incomplete Projects (${delayedProjects.length} items):\n`;
    delayedProjects.forEach(p => {
      reportText += `  - ${p.name}: Deadline: ${new Date(p.end_date).toLocaleDateString()}\n`;
    });
    reportText += `\n`;

    // Section 4: Transfers
    reportText += `4. STOCK TRANSFERS SUMMARY\n`;
    reportText += `---------------------------------------\n`;
    reportText += `* Pending transit transfers: ${pendingTransfersCount}\n`;
    reportText += `* Completed transits in last 30 days: ${completedTransfersLast30}\n`;
    reportText += `* Rejected transits in last 30 days: ${rejectedTransfersLast30}\n`;
    reportText += `\n=======================================`;

    try {
      await Share.share({
        title: 'EIH Inventory Analytics Report',
        message: reportText
      });
    } catch (error: any) {
      console.log('Error sharing report: ', error.message);
    }
  };

  const handleExportPDF = async () => {
    try {
      setLoading(true);

      // Build net worth category rows in HTML
      let categoryRows = '';
      Object.entries(categoriesMap).forEach(([cat, data]) => {
        categoryRows += `
          <tr>
            <td>${cat}</td>
            <td style="text-align: center;">${data.count}</td>
            <td style="text-align: right; font-weight: bold;">$${data.value.toLocaleString()}</td>
          </tr>
        `;
      });

      // Build low stock rows in HTML
      let lowStockRows = '';
      if (lowStockItems.length === 0) {
        lowStockRows = '<tr><td colspan="3" style="text-align: center; color: #64748b;">All items hold a safe quantity.</td></tr>';
      } else {
        lowStockItems.forEach(i => {
          lowStockRows += `
            <tr>
              <td>${i.item_name}</td>
              <td style="text-align: center; color: #ef4444; font-weight: bold;">${i.quantity}</td>
              <td style="text-align: center;">${i.reorder_level}</td>
            </tr>
          `;
        });
      }

      // Build out of stock rows in HTML
      let outOfStockRows = '';
      if (outOfStockItems.length === 0) {
        outOfStockRows = '<tr><td colspan="2" style="text-align: center; color: #64748b;">Zero critical stock deficits.</td></tr>';
      } else {
        outOfStockItems.forEach(i => {
          outOfStockRows += `
            <tr>
              <td>${i.item_name}</td>
              <td style="text-align: center; color: #ef4444; font-weight: bold;">OUT OF STOCK</td>
            </tr>
          `;
        });
      }

      // Build movements rows in HTML
      let movementRows = '';
      if (filteredMovements.length === 0) {
        movementRows = '<tr><td colspan="4" style="text-align: center; color: #64748b;">No movements recorded in date range.</td></tr>';
      } else {
        filteredMovements.forEach(m => {
          const typeLabel = m.type === 'in' ? '<span style="color: #10b981; font-weight: bold;">+IN</span>' : '<span style="color: #ef4444; font-weight: bold;">-OUT</span>';
          movementRows += `
            <tr>
              <td>${m.item_name}</td>
              <td style="text-align: center;">${typeLabel}</td>
              <td style="text-align: center;">${m.quantity}</td>
              <td>${m.created_at ? new Date(m.created_at).toLocaleDateString() : 'N/A'}</td>
            </tr>
          `;
        });
      }

      // Build over budget project rows in HTML
      let overBudgetRows = '';
      if (overBudgetProjects.length === 0) {
        overBudgetRows = '<tr><td colspan="3" style="text-align: center; color: #64748b;">All projects conform to their budget lines.</td></tr>';
      } else {
        overBudgetProjects.forEach(p => {
          overBudgetRows += `
            <tr>
              <td>${p.name}</td>
              <td style="text-align: right;">$${p.budget.toLocaleString()}</td>
              <td style="text-align: right; color: #ef4444; font-weight: bold;">$${p.actual_cost.toLocaleString()}</td>
            </tr>
          `;
        });
      }

      // HTML template for the PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>EIH Inventory Analytics Audit</title>
          <style>
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 24px;
              background-color: #ffffff;
            }
            .header-container {
              background-color: #1E3A8A;
              color: #ffffff;
              padding: 32px;
              border-radius: 12px;
              margin-bottom: 32px;
            }
            .header-container h1 {
              margin: 0;
              font-size: 28px;
              font-weight: bold;
              letter-spacing: 0.5px;
            }
            .header-container p {
              margin: 8px 0 0 0;
              font-size: 14px;
              color: #94a3b8;
            }
            .meta-info {
              display: flex;
              justify-content: space-between;
              font-size: 12px;
              color: #64748b;
              border-bottom: 2px solid #cbd5e1;
              padding-bottom: 12px;
              margin-bottom: 24px;
            }
            .section {
              margin-bottom: 32px;
            }
            .section-title {
              font-size: 18px;
              font-weight: bold;
              color: #1E3A8A;
              border-bottom: 2px solid #1E3A8A;
              padding-bottom: 8px;
              margin-bottom: 16px;
            }
            .stats-grid {
              display: flex;
              gap: 16px;
              margin-bottom: 24px;
            }
            .stats-card {
              flex: 1;
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              padding: 16px;
              border-radius: 8px;
              text-align: center;
            }
            .stats-card .label {
              font-size: 12px;
              color: #64748b;
              font-weight: 500;
              margin-bottom: 4px;
            }
            .stats-card .val {
              font-size: 20px;
              font-weight: bold;
              color: #1e293b;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 24px;
            }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 10px 12px;
              text-align: left;
              font-size: 13px;
            }
            th {
              background-color: #f1f5f9;
              font-weight: bold;
              color: #475569;
            }
            .alert-text {
              font-weight: bold;
              color: #ef4444;
            }
            .footer {
              text-align: center;
              font-size: 11px;
              color: #94a3b8;
              border-top: 1px solid #cbd5e1;
              padding-top: 16px;
              margin-top: 48px;
            }
          </style>
        </head>
        <body>
          <div class="header-container">
            <h1>EIH Inventory Analytics & Audit Report</h1>
            <p>Generated by EIH System Administration Control Panel</p>
          </div>

          <div class="meta-info">
            <div><strong>Date Generated:</strong> ${new Date().toLocaleDateString()}</div>
            <div><strong>System Scope:</strong> Full Ledger Integration</div>
          </div>

          <!-- Section 1: Inventory -->
          <div class="section">
            <div class="section-title">1. Inventory Catalog Audit</div>
            <div class="stats-grid">
              <div class="stats-card">
                <div class="label">Total catalog items</div>
                <div class="val">${totalItemsCount}</div>
              </div>
              <div class="stats-card">
                <div class="label">Net Catalog Worth</div>
                <div class="val" style="color: #10b981;">$${totalInventoryValue.toLocaleString()}</div>
              </div>
            </div>

            <h3>Category Value Breakdown</h3>
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th style="text-align: center;">Item Count</th>
                  <th style="text-align: right;">Total Category Value</th>
                </tr>
              </thead>
              <tbody>
                ${categoryRows}
              </tbody>
            </table>

            <div style="display: flex; gap: 16px;">
              <div style="flex: 1;">
                <h3 style="color: #f97316;">Low Stock Items</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Item Name</th>
                      <th style="text-align: center;">Available Qty</th>
                      <th style="text-align: center;">Reorder Trigger</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${lowStockRows}
                  </tbody>
                </table>
              </div>

              <div style="flex: 1;">
                <h3 style="color: #ef4444;">Out of Stock Items</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Item Name</th>
                      <th style="text-align: center;">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${outOfStockRows}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Section 2: Movements -->
          <div class="section" style="page-break-before: always;">
            <div class="section-title">2. Stock Movements Report</div>
            <p style="font-size: 13px; margin-bottom: 16px;">
              <strong>Active Window Filters:</strong> ${fromDate} to ${toDate}
            </p>
            <div class="stats-grid">
              <div class="stats-card">
                <div class="label">Total Inbound Actions</div>
                <div class="val" style="color: #10b981;">+${totalStockIn}</div>
              </div>
              <div class="stats-card">
                <div class="label">Total Outbound Actions</div>
                <div class="val" style="color: #ef4444;">-${totalStockOut}</div>
              </div>
            </div>

            <h3>Stock Movement Logs (Filtered Window)</h3>
            <table>
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th style="text-align: center;">Transaction</th>
                  <th style="text-align: center;">Quantity</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                ${movementRows}
              </tbody>
            </table>
          </div>

          <!-- Section 3: Projects -->
          <div class="section" style="page-break-before: always;">
            <div class="section-title">3. Projects and Budgets Statement</div>
            <div class="stats-grid">
              <div class="stats-card">
                <div class="label">Total Global Budget</div>
                <div class="val">$${totalBudget.toLocaleString()}</div>
              </div>
              <div class="stats-card">
                <div class="label">Total Actual Expended</div>
                <div class="val" style="color: ${totalActualCost > totalBudget ? '#ef4444' : '#10b981'};">$${totalActualCost.toLocaleString()}</div>
              </div>
            </div>

            <h3>Cost-Overrun Projects</h3>
            <table>
              <thead>
                <tr>
                  <th>Project Name</th>
                  <th style="text-align: right;">Target Budget</th>
                  <th style="text-align: right;">Actual Cost</th>
                </tr>
              </thead>
              <tbody>
                ${overBudgetRows}
              </tbody>
            </table>
          </div>

          <!-- Section 4: Transfers -->
          <div class="section">
            <div class="section-title">4. Stock Transfers Summary</div>
            <div class="stats-grid">
              <div class="stats-card">
                <div class="label">Pending Transits</div>
                <div class="val" style="color: #f59e0b;">${pendingTransfersCount}</div>
              </div>
              <div class="stats-card">
                <div class="label">Completed Transits (Last 30d)</div>
                <div class="val" style="color: #10b981;">${completedTransfersLast30}</div>
              </div>
              <div class="stats-card">
                <div class="label">Rejected Transits (Last 30d)</div>
                <div class="val" style="color: #ef4444;">${rejectedTransfersLast30}</div>
              </div>
            </div>
          </div>

          <div class="footer">
            EIH Inventory Management System • Confidential & Proprietary Report • Generated by system administrators.
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Export EIH Report PDF' });
    } catch (e: any) {
      console.error('PDF Generation Error:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E3A8A" />
        <Text style={styles.loadingText}>Compiling system analytics & PDF layout...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Hero Banner */}
      <Surface style={styles.headerSurface} elevation={1}>
        <View style={styles.headerText}>
          <Text variant="headlineSmall" style={styles.title}>System Analytics & Audits</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Live summary statistics, stock movements, and financial statements
          </Text>
        </View>
        <IconButton 
          icon="file-pdf-box" 
          iconColor="#ffffff" 
          size={26} 
          onPress={handleExportPDF} 
        />
      </Surface>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        
        {/* Accordion 1: Inventory Summary */}
        <List.Accordion
          title="1. Inventory Summary Audit"
          left={props => <List.Icon {...props} icon="package-variant-closed" color="#1E3A8A" />}
          expanded={inventoryExpanded}
          onPress={() => setInventoryExpanded(!inventoryExpanded)}
          style={styles.accordionHeader}
          titleStyle={styles.accordionTitle}
        >
          <View style={styles.accordionContent}>
            <View style={styles.statsGrid}>
              <Card style={styles.statsCard}>
                <Card.Content>
                  <Text variant="bodySmall" style={styles.statsLabel}>Total Items</Text>
                  <Text variant="titleLarge" style={styles.statsVal}>{totalItemsCount}</Text>
                </Card.Content>
              </Card>

              <Card style={styles.statsCard}>
                <Card.Content>
                  <Text variant="bodySmall" style={styles.statsLabel}>Net Net Worth</Text>
                  <Text variant="titleLarge" style={[styles.statsVal, { color: '#10b981' }]}>
                    ${totalInventoryValue.toLocaleString()}
                  </Text>
                </Card.Content>
              </Card>
            </View>

            {/* Net Worth Category splits */}
            <Text variant="titleSmall" style={styles.subHeader}>Net Worth split by Category</Text>
            {Object.entries(categoriesMap).map(([cat, data]) => (
              <View style={styles.listItemRow} key={cat}>
                <Text style={styles.listLabel}>{cat} ({data.count} items)</Text>
                <Text style={styles.listValue}>${data.value.toLocaleString()}</Text>
              </View>
            ))}

            {/* Low stock alerts */}
            <Text variant="titleSmall" style={[styles.subHeader, { color: '#f97316' }]}>
              Low Stock Alerts ({lowStockItems.length} items)
            </Text>
            {lowStockItems.length === 0 ? (
              <Text style={styles.emptyAccordionText}>All items hold a safe quantity.</Text>
            ) : (
              lowStockItems.map(item => (
                <View style={styles.listItemRow} key={item.id}>
                  <Text style={styles.listLabel}>{item.item_name}</Text>
                  <Text style={[styles.listValue, { color: '#f97316', fontWeight: 'bold' }]}>
                    {item.quantity} / {item.reorder_level} reorder
                  </Text>
                </View>
              ))
            )}

            {/* Out of stock list */}
            <Text variant="titleSmall" style={[styles.subHeader, { color: '#ef4444' }]}>
              Out of Stock Alerts ({outOfStockItems.length} items)
            </Text>
            {outOfStockItems.length === 0 ? (
              <Text style={styles.emptyAccordionText}>Zero critical stock deficits.</Text>
            ) : (
              outOfStockItems.map(item => (
                <View style={styles.listItemRow} key={item.id}>
                  <Text style={styles.listLabel}>{item.item_name}</Text>
                  <Text style={[styles.listValue, { color: '#ef4444', fontWeight: 'bold' }]}>OUT</Text>
                </View>
              ))
            )}
          </View>
        </List.Accordion>

        <Divider />

        {/* Accordion 2: Stock Movement Report */}
        <List.Accordion
          title="2. Stock Movement Audits"
          left={props => <List.Icon {...props} icon="swap-vertical-variant" color="#1E3A8A" />}
          expanded={movementsExpanded}
          onPress={() => setMovementsExpanded(!movementsExpanded)}
          style={styles.accordionHeader}
          titleStyle={styles.accordionTitle}
        >
          <View style={styles.accordionContent}>
            {/* Range Pickers */}
            <Text variant="titleSmall" style={styles.subHeader}>Define Date Window Range</Text>
            <View style={styles.rangeRow}>
              <TextInput 
                label="From Date" 
                value={fromDate} 
                onChangeText={setFromDate} 
                mode="outlined" 
                style={styles.rangeInput} 
                placeholder="YYYY-MM-DD"
              />
              <TextInput 
                label="To Date" 
                value={toDate} 
                onChangeText={setToDate} 
                mode="outlined" 
                style={styles.rangeInput} 
                placeholder="YYYY-MM-DD"
              />
            </View>

            <View style={styles.statsGrid}>
              <Card style={styles.statsCard}>
                <Card.Content>
                  <Text variant="bodySmall" style={styles.statsLabel}>Total Stock-In</Text>
                  <Text variant="titleLarge" style={[styles.statsVal, { color: '#10b981' }]}>+{totalStockIn}</Text>
                </Card.Content>
              </Card>

              <Card style={styles.statsCard}>
                <Card.Content>
                  <Text variant="bodySmall" style={styles.statsLabel}>Total Stock-Out</Text>
                  <Text variant="titleLarge" style={[styles.statsVal, { color: '#ef4444' }]}>-{totalStockOut}</Text>
                </Card.Content>
              </Card>
            </View>

            {/* Movements list */}
            <Text variant="titleSmall" style={styles.subHeader}>Live Movement Logs ({filteredMovements.length})</Text>
            {filteredMovements.length === 0 ? (
              <Text style={styles.emptyAccordionText}>No recorded logs within this time window.</Text>
            ) : (
              filteredMovements.slice(0, 15).map(m => (
                <View style={styles.moveItem} key={m.id}>
                  <View style={styles.moveHeader}>
                    <Text style={styles.moveItemName}>{m.item_name}</Text>
                    <Text style={[styles.moveQty, { color: m.type === 'in' ? '#10b981' : '#ef4444' }]}>
                      {m.type === 'in' ? '+' : '-'}{m.quantity} units
                    </Text>
                  </View>
                  <Text style={styles.moveDesc}>
                    Depot: {m.from_location || m.to_location || 'Warehouse'} • By User: {m.user_id}
                  </Text>
                  <Text style={styles.moveDate}>{new Date(m.created_at).toLocaleString()}</Text>
                  <Divider style={{ marginVertical: 6 }} />
                </View>
              ))
            )}
          </View>
        </List.Accordion>

        <Divider />

        {/* Accordion 3: Project Summary Report */}
        <List.Accordion
          title="3. Projects & Budgets Audits"
          left={props => <List.Icon {...props} icon="briefcase" color="#1E3A8A" />}
          expanded={projectsExpanded}
          onPress={() => setProjectsExpanded(!projectsExpanded)}
          style={styles.accordionHeader}
          titleStyle={styles.accordionTitle}
        >
          <View style={styles.accordionContent}>
            {/* Status summaries */}
            <Text variant="titleSmall" style={styles.subHeader}>Project Status Counts</Text>
            <View style={styles.statusWrap}>
              {Object.entries(projectsByStatus).map(([status, count]) => (
                <View style={styles.statusChip} key={status}>
                  <Text style={styles.chipText}>{status}: {count}</Text>
                </View>
              ))}
            </View>

            {/* Budgets summaries */}
            <View style={styles.statsGrid}>
              <Card style={styles.statsCard}>
                <Card.Content>
                  <Text variant="bodySmall" style={styles.statsLabel}>Total Global Budget</Text>
                  <Text variant="titleLarge" style={styles.statsVal}>${totalBudget.toLocaleString()}</Text>
                </Card.Content>
              </Card>

              <Card style={styles.statsCard}>
                <Card.Content>
                  <Text variant="bodySmall" style={styles.statsLabel}>Total Global Expended</Text>
                  <Text variant="titleLarge" style={[styles.statsVal, { color: totalActualCost > totalBudget ? '#ef4444' : '#10b981' }]}>
                    ${totalActualCost.toLocaleString()}
                  </Text>
                </Card.Content>
              </Card>
            </View>

            {/* Over budget list */}
            <Text variant="titleSmall" style={[styles.subHeader, { color: '#ef4444' }]}>
              Over-Budget Projects ({overBudgetProjects.length} items)
            </Text>
            {overBudgetProjects.length === 0 ? (
              <Text style={styles.emptyAccordionText}>All projects conform to their budget lines.</Text>
            ) : (
              overBudgetProjects.map(p => (
                <View style={styles.listItemRow} key={p.id}>
                  <Text style={styles.listLabel}>{p.name}</Text>
                  <Text style={[styles.listValue, { color: '#ef4444', fontWeight: 'bold' }]}>
                    +${(p.actual_cost - p.budget).toLocaleString()}
                  </Text>
                </View>
              ))
            )}

            {/* Delayed projects */}
            <Text variant="titleSmall" style={[styles.subHeader, { color: '#f97316' }]}>
              Overdue Incomplete Projects ({delayedProjects.length} items)
            </Text>
            {delayedProjects.length === 0 ? (
              <Text style={styles.emptyAccordionText}>All active projects are within their target deadlines.</Text>
            ) : (
              delayedProjects.map(p => (
                <View style={styles.listItemRow} key={p.id}>
                  <Text style={styles.listLabel}>{p.name}</Text>
                  <Text style={[styles.listValue, { color: '#f97316', fontWeight: 'bold' }]}>
                    Due: {new Date(p.end_date).toLocaleDateString()}
                  </Text>
                </View>
              ))
            )}
          </View>
        </List.Accordion>

        <Divider />

        {/* Accordion 4: Transfer Report */}
        <List.Accordion
          title="4. Stock Transfers Summary"
          left={props => <List.Icon {...props} icon="transit-connection" color="#1E3A8A" />}
          expanded={transfersExpanded}
          onPress={() => setTransfersExpanded(!transfersExpanded)}
          style={styles.accordionHeader}
          titleStyle={styles.accordionTitle}
        >
          <View style={styles.accordionContent}>
            <View style={styles.statsGrid}>
              <Card style={styles.statsCard}>
                <Card.Content>
                  <Text variant="bodySmall" style={styles.statsLabel}>Pending Transits</Text>
                  <Text variant="titleLarge" style={[styles.statsVal, { color: '#f59e0b' }]}>{pendingTransfersCount}</Text>
                </Card.Content>
              </Card>

              <Card style={styles.statsCard}>
                <Card.Content>
                  <Text variant="bodySmall" style={styles.statsLabel}>Completed (30d)</Text>
                  <Text variant="titleLarge" style={[styles.statsVal, { color: '#10b981' }]}>{completedTransfersLast30}</Text>
                </Card.Content>
              </Card>
            </View>

            <View style={styles.listItemRow} style={{ marginTop: 12 }}>
              <Text style={styles.listLabel}>Rejected Transits in Last 30 Days:</Text>
              <Text style={[styles.listValue, { color: '#ef4444', fontWeight: 'bold' }]}>{rejectedTransfersLast30}</Text>
            </View>
          </View>
        </List.Accordion>

      </ScrollView>

      {/* Share Actions Panel Button at bottom */}
      <View style={styles.actionsPanel}>
        <Button 
          mode="outlined" 
          onPress={handleExportText} 
          icon="share-variant"
          textColor="#1E3A8A"
          style={[styles.exportBtn, { marginRight: 8, borderColor: '#1E3A8A', borderWidth: 1.5 }]}
        >
          Share Text
        </Button>
        <Button 
          mode="contained" 
          onPress={handleExportPDF} 
          icon="file-pdf-box"
          buttonColor="#1E3A8A"
          textColor="#ffffff"
          style={[styles.exportBtn, { flex: 1.5 }]}
        >
          Print PDF Report
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
  },
  headerSurface: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#1E3A8A',
  },
  headerText: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#94a3b8',
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  accordionHeader: {
    backgroundColor: '#ffffff',
  },
  accordionTitle: {
    fontWeight: 'bold',
    color: '#0f172a',
  },
  accordionContent: {
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statsCard: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: '#ffffff',
    elevation: 1,
  },
  statsLabel: {
    color: '#64748b',
    fontWeight: '500',
  },
  statsVal: {
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 4,
  },
  subHeader: {
    fontWeight: 'bold',
    color: '#334155',
    marginVertical: 10,
  },
  listItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  listLabel: {
    color: '#475569',
  },
  listValue: {
    color: '#0f172a',
    fontWeight: '500',
  },
  emptyAccordionText: {
    color: '#94a3b8',
    fontSize: 13,
    paddingVertical: 8,
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  rangeInput: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: '#ffffff',
  },
  moveItem: {
    paddingVertical: 4,
  },
  moveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moveItemName: {
    fontWeight: 'bold',
    color: '#334155',
  },
  moveQty: {
    fontWeight: 'bold',
  },
  moveDesc: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  moveDate: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  statusWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  statusChip: {
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    margin: 4,
  },
  chipText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionsPanel: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
  },
  exportBtn: {
    flex: 1,
    borderRadius: 8,
  },
});
