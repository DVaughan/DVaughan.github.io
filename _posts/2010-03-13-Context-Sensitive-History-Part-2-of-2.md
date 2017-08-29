---
categories: .NET
redirect_from:
 - /post/Article-Published-Context-Sensitive-History-Part-2-of-2.aspx.html
---

This part focusses on the Calcium integration of the Task Model.

This project is a Desktop and Silverlight user action management system, with undo, redo, and repeat. Allowing actions to be monitored, and grouped according to a context (such as a UI control), executed sequentially or in parallel, and even to be rolled back on failure.

A 'task' is the term I use to describe application work units, 
instigated by the user or the system.

The main features of the task management system provided in this article are:

* Tasks can be undone, redone, and repeated.
* Task execution may be cancelled.
* Composite tasks allow sequential and parallel execution of tasks with automatic rollback on failure of an individual task.
* Tasks can be associated with a context, such as a UserControl, so that the undo, redo, and repeat actions can be, for example, enabled according to UI focus.
* Tasks can be global, having no context association.
* The task system can be wired to ICommands.
* Tasks can be chained, in that one task can use the Task Service to perform another.
* Return to a point in history by specifying an undo point.
* Coherency in the system is preserved by disallowing the execution of tasks outside of the Task Service.
* Task Model compatible with both the Silverlight and Desktop CLRs

[Read on...](http://www.codeproject.com/KB/WPF/UndoRedoRepeat02.aspx)