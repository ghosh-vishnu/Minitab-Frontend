import { useState } from 'react'

// Complete menu structure for Minitab-style Stat menu
const MENU_STRUCTURE = {
  label: 'Stat',
  submenu: [
    {
      label: 'Basic Statistics',
      submenu: [
        { label: 'Display Descriptive Statistics...' },
        { label: 'Store Descriptive Statistics...' },
        { label: 'Correlation...' },
        { label: 'Covariance...' },
      ],
    },
    {
      label: 'Regression',
      submenu: [
        { label: 'Regression...' },
        { label: 'Logistic Regression...' },
        { label: 'Poisson Regression...' },
        { label: 'Nominal Logistic Regression...' },
        { label: 'Ordinal Logistic Regression...' },
      ],
    },
    {
      label: 'ANOVA',
      submenu: [
        { label: 'One-Way...' },
        { label: 'Two-Way...' },
        { label: 'General Linear Model...' },
        { label: 'Main Effects Plot...' },
      ],
    },
    {
      label: 'DOE',
      submenu: [
        { label: 'Factorial...' },
        { label: 'Response Surface...' },
        { label: 'Mixture...' },
        { label: 'Taguchi...' },
      ],
    },
    {
      label: 'Control Charts',
      submenu: [
        { label: 'Box-Cox Transformation...' },
        {
          label: 'Variables Charts for Subgroups',
          submenu: [
            { label: 'Xbar-R...' },
            { label: 'Xbar-S...' },
            { label: 'I-MR/S (Between/Within)...' },
            { label: 'Zone...' },
          ],
        },
        {
          label: 'Variables Charts for Individuals',
          submenu: [
            { label: 'I-MR...' },
            { label: 'Z-MR...' },
            { label: 'Individuals' },
            { label: 'Moving Range...' },

            
          ],
        },
        {
          label: 'Attributes Charts',
          submenu: [
            { label: 'P Chart Diagnostic...' },
            { label: 'P...' },
            { label: 'Laney P...' },
            { label: 'NP...' },
            { label: 'U Chart Diagnostic...' },
            { label: 'U...' },
            { label: 'Laney U...' },
            { label: 'C...' },
          ],
        },
        {
          label: 'Time-Weighted Charts',
          submenu: [
            { label: 'Moving Average...' },
            { label: 'EWMA...' },
            { label: 'CUSUM...' },
          ],
        },
        {
          label: 'Multivariate Charts',
          submenu: [
            { label: 'T²-Generalized Variance...' },
            { label: 'T²...' },
            { label: 'Generalized Variance...' },
            { label: 'Multivariate EWMA...' },
          ],
        },
        {
          label: 'Rare Event Charts',
          submenu: [
            { label: 'G...' },
            { label: 'T...' },
          ],
        },
      ],
    },
    {
      label: 'Quality Tools',
      submenu: [
        { label: 'Pareto Chart...' },
        { label: 'Cause-and-Effect...' },
        { label: 'Measurement System Analysis...' },
      ],
    },
    {
      label: 'Reliability/Survival',
      submenu: [
        { label: 'Distribution Analysis...' },
        { label: 'Life Data (Right Censoring)...' },
        { label: 'Parametric Survival Regression...' },
      ],
    },
    {
      label: 'Multivariate',
      submenu: [
        { label: 'Principal Components Analysis...' },
        { label: 'Factor Analysis...' },
        { label: 'Cluster Observations...' },
        { label: 'Discriminant Analysis...' },
      ],
    },
    {
      label: 'Time Series',
      submenu: [
        { label: 'Trend Analysis...' },
        { label: 'Decomposition...' },
        { label: 'Moving Average...' },
        { label: 'Exponential Smoothing...' },
      ],
    },
    {
      label: 'Tables',
      submenu: [
        { label: 'Tally...' },
        { label: 'Cross Tabulation and Chi-Square...' },
      ],
    },
    {
      label: 'Nonparametrics',
      submenu: [
        { label: 'One-Sample Sign...' },
        { label: 'One-Sample Wilcoxon...' },
        { label: 'Kruskal-Wallis...' },
      ],
    },
    {
      label: 'Equivalence Tests',
      submenu: [
        { label: 'One-Sample...' },
        { label: 'Two-Sample...' },
        { label: 'Paired...' },
      ],
    },
    {
      label: 'Power and Sample Size',
      submenu: [
        { label: 'Sample Size for Estimation...' },
        { label: 'Sample Size for Hypothesis Tests...' },
        { label: 'Power Curve...' },
      ],
    },
  ],
}

const StatMenu = () => {
  const [isOpen, setIsOpen] = useState(false)

  const statItems = MENU_STRUCTURE.submenu.map((item) => item.label)

  const handleMenuClick = () => {
    setIsOpen(!isOpen)
  }

  const handleItemClick = (itemLabel: string) => {
    console.log('Selected:', itemLabel)
    try {
      const event = new CustomEvent('stat-menu-select', { detail: { label: itemLabel } })
      document.dispatchEvent(event)
    } catch (e) {
      // Dialog system not available
    }
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={handleMenuClick}
        className={`
          px-3 py-1 text-xs font-medium transition-colors cursor-pointer leading-tight
          ${
            isOpen
              ? 'text-emerald-700 border-b-2 border-emerald-600'
              : 'text-gray-700 hover:text-gray-900'
          }
        `}
      >
        Stat
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Content */}
          <div className="absolute top-full left-0 mt-0 bg-white border border-gray-200 shadow-md min-w-[200px] max-w-[280px] z-20 py-1">
            {statItems.map((item, index) => (
              <button
                key={index}
                onClick={() => handleItemClick(item)}
                className="w-full px-4 py-1 text-left text-xs text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer leading-tight"
              >
                {item}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default StatMenu
