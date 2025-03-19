'use client'

import React from 'react';
import {  Card  } from '@/components/ui/card';
import { PieChart, BarChart } from 'recharts';

const Reports = ({ projects }) => {
  // Calculate goals by status
  const goalsByStatus = projects.reduce((acc, project) => {
    project.tasks.forEach(task => {
      acc[task.status] = (acc[task.status] || 0) + 1;
    });
    return acc;
  }, {});

  // Calculate tasks by priority
  const tasksByPriority = projects.reduce((acc, project) => {
    project.tasks.forEach(task => {
      const priority = task.hoursSpent > task.totalHours ? 'High' :
                      task.hoursSpent === 0 ? 'Low' : 'Medium';
      acc[priority] = (acc[priority] || 0) + 1;
    });
    return acc;
  }, {});

  // Calculate tasks by assignee
  const tasksByAssignee = projects.reduce((acc, project) => {
    project.tasks.forEach(task => {
      if (task.owner) {
        acc[task.owner] = (acc[task.owner] || 0) + 1;
      }
    });
    return acc;
  }, {});

  // Format data for charts
  const statusData = [
    { name: 'On track', value: goalsByStatus['In Progress'] || 0, color: '#60A5FA' },
    { name: 'At risk', value: goalsByStatus['Blocked'] || 0, color: '#F87171' },
    { name: 'Off track', value: goalsByStatus['Not Started'] || 0, color: '#34D399' }
  ];

  const priorityData = [
    { name: 'Low', value: tasksByPriority['Low'] || 0, color: '#F59E0B' },
    { name: 'Medium', value: tasksByPriority['Medium'] || 0, color: '#60A5FA' },
    { name: 'High', value: tasksByPriority['High'] || 0, color: '#EF4444' },
    { name: 'On Hold', value: goalsByStatus['Blocked'] || 0, color: '#10B981' }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Goals by Status */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Goals by status</h3>
          <div className="relative aspect-square">
            <PieChart width={300} height={300} data={statusData}>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                {statusData.reduce((sum, item) => sum + item.value, 0)}
              </text>
            </PieChart>
          </div>
        </Card>

        {/* Team Tasks by Priority */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Team tasks by priority</h3>
          <BarChart width={400} height={300} data={priorityData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Bar dataKey="value">
              {priorityData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </Card>

        {/* Quarterly Goals by Owner */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Quarterly goals by owner</h3>
          <BarChart width={400} height={300} data={Object.entries(tasksByAssignee).map(([name, value]) => ({
            name,
            value
          }))}>
            <XAxis dataKey="name" />
            <YAxis />
            <Bar dataKey="value" fill="#60A5FA" />
          </BarChart>
        </Card>

        {/* Upcoming Tasks by Assignee */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Upcoming tasks by assignee</h3>
          <div className="space-y-4">
            {Object.entries(tasksByAssignee).map(([name, count]) => (
              <div key={name} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-sm">
                  {name[0]}
                </div>
                <div className="flex-1">
                  <div className="h-2 bg-purple-100 rounded-full">
                    <div 
                      className="h-2 bg-purple-500 rounded-full"
                      style={{ width: `${(count / Math.max(...Object.values(tasksByAssignee))) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-medium">{count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Reports; 