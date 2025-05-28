const express = require('express');
const { Op } = require('sequelize');
const Page = require('../Models/Page');

const router = express.Router();

const getPages = async (req, res) => {
  try {
    const pages = await Page.findAll();
    res.json(pages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pages' });
  }
}

// Get a single page by ID
const singlePageById = async (req, res) => {
  try {
    const page = await Page.findByPk(req.params.id);
    if (page) {
      res.json(page);
    } else {
      res.status(404).json({ error: 'Page not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch the page' });
  }
}

// Add a new page
const addPage = async (req, res) => {
  try {
    const { title, status, description } = req.body;
    const newPage = await Page.create({ title, status, description });
    res.status(200).json(newPage);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create page' });
  }
}

// Update an existing page
const EditPage = async (req, res) => {
  try {
    const { title, status, description } = req.body;
    const page = await Page.findByPk(req.params.id);

    if (page) {
      await page.update({ title, status, description });
      res.json(page);
    } else {
      res.status(404).json({ error: 'Page not found' });
    }
  } catch (error) {
    res.status(400).json({ error: 'Failed to update page' });
  }
}

// Delete a page
const deletePage = async (req, res) => {
  try {
    const page = await Page.findByPk(req.params.id);

    if (page) {
      await page.destroy();
      res.json({ message: 'Page deleted successfully' });
    } else {
      res.status(404).json({ error: 'Page not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete page' });
  }
}

module.exports = {
    EditPage,addPage,getPages,deletePage,singlePageById
};
