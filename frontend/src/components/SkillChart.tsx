'use client';

import React from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer 
} from 'recharts';

interface SkillChartProps {
  data: Array<{
    subject: string;
    A: number;
    fullMark: number;
  }>;
}

export default function SkillChart({ data }: SkillChartProps) {
  if (!data || data.length === 0) return null;

  return (
    <div className="w-full h-[320px] flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <RadarChart 
          cx="50%" 
          cy="50%" 
          outerRadius="60%" 
          data={data}
          margin={{ top: 20, right: 30, bottom: 20, left: 30 }}
        >
          <PolarGrid stroke="rgba(255,255,255,0.1)" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} 
          />
          <PolarRadiusAxis 
            angle={30} 
            domain={[0, 100]} 
            tick={false} 
            axisLine={false} 
          />
          <Radar 
            name="Kỹ năng" 
            dataKey="A" 
            stroke="#6366f1" 
            fill="#6366f1" 
            fillOpacity={0.6} 
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
