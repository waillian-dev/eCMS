import React from 'react';
import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { AntDesign, Feather } from '@expo/vector-icons';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  const themeColors = {
    dark: {
      background: '#090D16',
      tabBar: '#0F172A',
      border: '#1E293B',
      active: '#3B82F6',
      inactive: '#64748B',
    },
    light: {
      background: '#F8FAFC',
      tabBar: '#FFFFFF',
      border: '#E2E8F0',
      active: '#2563EB',
      inactive: '#94A3B8',
    },
  };

  const colors = colorScheme === 'dark' ? themeColors.dark : themeColors.light;

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.tabBar,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        headerTitleStyle: {
          color: colorScheme === 'dark' ? '#FFFFFF' : '#0F172A',
          fontWeight: 'bold',
        },
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: 8,
          height: 60,
        },
        tabBarActiveTintColor: colors.active,
        tabBarInactiveTintColor: colors.inactive,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <AntDesign name="home" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="complaints"
        options={{
          title: 'Tickets',
          tabBarIcon: ({ color }) => <Feather name="file-text" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <AntDesign name="user" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
